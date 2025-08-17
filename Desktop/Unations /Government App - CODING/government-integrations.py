"""
Government System Integration Layer for Indigenous Business Verification
Connects to all federal and provincial systems for real-time verification
"""

import asyncio
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import aiohttp
import xmltodict
from cryptography.fernet import Fernet

# System Integration Configuration
class SystemCode(Enum):
    # Federal Systems
    CRA = "cra"  # Canada Revenue Agency
    ISED = "ised"  # Innovation, Science and Economic Development
    ISC = "isc"  # Indigenous Services Canada
    PSPC = "pspc"  # Public Services and Procurement Canada
    
    # Provincial Corporate Registries
    ON_ONBIS = "on_onbis"  # Ontario Business Information System
    QC_REQ = "qc_req"  # Quebec Registraire des entreprises
    BC_REG = "bc_reg"  # BC Corporate Registry
    AB_REG = "ab_reg"  # Alberta Corporate Registry
    
    # Indigenous Registries
    CCAB = "ccab"  # Canadian Council for Aboriginal Business
    SUPPLY_NATION = "supply_nation"  # If expanding internationally

@dataclass
class SystemEndpoint:
    """Configuration for each government system endpoint"""
    base_url: str
    auth_type: str  # oauth2, api_key, certificate
    timeout: int = 30
    retry_attempts: int = 3
    cache_ttl: int = 3600  # seconds

class GovernmentSystemIntegrator:
    """
    Manages all government system integrations with security, caching, and audit trails
    """
    
    def __init__(self, db_connection, encryption_key: bytes):
        self.db = db_connection
        self.cipher = Fernet(encryption_key)
        self.session = None
        
        # System endpoints configuration
        self.endpoints = {
            SystemCode.CRA: SystemEndpoint(
                base_url="https://api.cra-arc.gc.ca/v1",
                auth_type="oauth2",
                timeout=60
            ),
            SystemCode.ISED: SystemEndpoint(
                base_url="https://ised-isde.canada.ca/api/v2",
                auth_type="api_key"
            ),
            SystemCode.ISC: SystemEndpoint(
                base_url="https://api.sac-isc.gc.ca/indigenous-verification/v1",
                auth_type="certificate"
            ),
            SystemCode.PSPC: SystemEndpoint(
                base_url="https://buyandsell.gc.ca/api/v1",
                auth_type="oauth2"
            ),
            SystemCode.ON_ONBIS: SystemEndpoint(
                base_url="https://www.appmjobs.com/onbis/api",
                auth_type="api_key"
            ),
            SystemCode.QC_REQ: SystemEndpoint(
                base_url="https://www.registreentreprises.gouv.qc.ca/api",
                auth_type="api_key"
            )
        }
        
        # Cache for reducing API calls
        self.cache = {}
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    async def verify_business_across_systems(self, business_number: str) -> Dict:
        """
        Verify a business across all relevant government systems
        Returns consolidated verification data
        """
        verification_results = {
            'business_number': business_number,
            'verification_timestamp': datetime.utcnow().isoformat(),
            'systems_checked': [],
            'consolidated_data': {},
            'red_flags': [],
            'verification_score': 0.0
        }
        
        # Determine which systems to check based on business number format
        systems_to_check = self._determine_relevant_systems(business_number)
        
        # Run all verifications in parallel for speed
        tasks = []
        for system in systems_to_check:
            tasks.append(self._verify_with_system(business_number, system))
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        for system, result in zip(systems_to_check, results):
            if isinstance(result, Exception):
                verification_results['red_flags'].append(f"Failed to verify with {system.value}: {str(result)}")
            else:
                verification_results['systems_checked'].append(system.value)
                self._merge_verification_data(verification_results['consolidated_data'], result)
                
                # Check for inconsistencies
                inconsistencies = self._check_data_inconsistencies(
                    verification_results['consolidated_data'], 
                    result, 
                    system
                )
                verification_results['red_flags'].extend(inconsistencies)
        
        # Calculate overall verification score
        verification_results['verification_score'] = self._calculate_verification_score(
            verification_results
        )
        
        # Store in database for audit trail
        await self._store_verification_results(business_number, verification_results)
        
        return verification_results
    
    async def _verify_with_system(self, business_number: str, system: SystemCode) -> Dict:
        """Verify with a specific government system"""
        
        # Check cache first
        cache_key = f"{system.value}:{business_number}"
        if cache_key in self.cache:
            cached_data, cached_time = self.cache[cache_key]
            if datetime.utcnow() - cached_time < timedelta(seconds=self.endpoints[system].cache_ttl):
                return cached_data
        
        # Make API call
        endpoint = self.endpoints[system]
        headers = await self._get_auth_headers(system)
        
        try:
            if system == SystemCode.CRA:
                data = await self._verify_cra(business_number, endpoint, headers)
            elif system == SystemCode.ISED:
                data = await self._verify_ised(business_number, endpoint, headers)
            elif system == SystemCode.ISC:
                data = await self._verify_isc(business_number, endpoint, headers)
            elif system == SystemCode.PSPC:
                data = await self._verify_pspc(business_number, endpoint, headers)
            elif system in [SystemCode.ON_ONBIS, SystemCode.QC_REQ]:
                data = await self._verify_provincial(business_number, system, endpoint, headers)
            else:
                raise NotImplementedError(f"System {system} not implemented")
            
            # Cache the result
            self.cache[cache_key] = (data, datetime.utcnow())
            
            # Log the integration
            await self._log_integration(system, business_number, True, None)
            
            return data
            
        except Exception as e:
            await self._log_integration(system, business_number, False, str(e))
            raise
    
    async def _verify_cra(self, business_number: str, endpoint: SystemEndpoint, headers: Dict) -> Dict:
        """
        Verify with Canada Revenue Agency
        Critical for tax compliance and corporate structure
        """
        async with self.session.get(
            f"{endpoint.base_url}/business/{business_number}",
            headers=headers,
            timeout=endpoint.timeout
        ) as response:
            data = await response.json()
            
            # Extract relevant information
            return {
                'system': 'CRA',
                'business_status': data.get('businessStatus'),
                'registration_date': data.get('registrationDate'),
                'business_type': data.get('businessType'),
                'gst_registered': data.get('gstRegistered'),
                'payroll_account': data.get('hasPayrollAccount'),
                'tax_filing_status': data.get('taxFilingStatus'),
                'directors': self._encrypt_sensitive_data(data.get('directors', [])),
                'mailing_address': data.get('mailingAddress'),
                'physical_address': data.get('physicalAddress')
            }
    
    async def _verify_ised(self, business_number: str, endpoint: SystemEndpoint, headers: Dict) -> Dict:
        """
        Verify with Innovation, Science and Economic Development Canada
        Corporate registry and ownership information
        """
        # ISED uses corporation number, extract from BN
        corp_number = business_number[:9]
        
        async with self.session.get(
            f"{endpoint.base_url}/corporations/{corp_number}",
            headers=headers,
            timeout=endpoint.timeout
        ) as response:
            data = await response.json()
            
            return {
                'system': 'ISED',
                'corporate_name': data.get('corporateName'),
                'incorporation_date': data.get('incorporationDate'),
                'jurisdiction': data.get('jurisdiction'),
                'corporate_status': data.get('status'),
                'share_structure': data.get('shareStructure'),
                'directors': self._encrypt_sensitive_data(data.get('directors', [])),
                'officers': self._encrypt_sensitive_data(data.get('officers', [])),
                'registered_office': data.get('registeredOffice')
            }
    
    async def _verify_isc(self, business_number: str, endpoint: SystemEndpoint, headers: Dict) -> Dict:
        """
        Verify with Indigenous Services Canada
        Critical for Indigenous status verification
        """
        async with self.session.post(
            f"{endpoint.base_url}/verify",
            headers=headers,
            json={'businessNumber': business_number},
            timeout=endpoint.timeout
        ) as response:
            data = await response.json()
            
            return {
                'system': 'ISC',
                'indigenous_certification': data.get('certificationStatus'),
                'certification_number': data.get('certificationNumber'),
                'certification_date': data.get('certificationDate'),
                'indigenous_ownership_percentage': data.get('indigenousOwnershipPercentage'),
                'verified_owners': self._encrypt_sensitive_data(data.get('verifiedOwners', [])),
                'community_affiliations': data.get('communityAffiliations'),
                'certification_type': data.get('certificationType')  # Band-owned, Inuit, Métis, etc.
            }
    
    async def _verify_pspc(self, business_number: str, endpoint: SystemEndpoint, headers: Dict) -> Dict:
        """
        Verify with Public Services and Procurement Canada
        Contract history and performance
        """
        async with self.session.get(
            f"{endpoint.base_url}/suppliers/{business_number}/contracts",
            headers=headers,
            timeout=endpoint.timeout
        ) as response:
            data = await response.json()
            
            contracts = data.get('contracts', [])
            
            # Calculate performance metrics
            total_value = sum(c.get('value', 0) for c in contracts)
            completed_contracts = [c for c in contracts if c.get('status') == 'completed']
            
            return {
                'system': 'PSPC',
                'supplier_status': data.get('supplierStatus'),
                'registration_date': data.get('registrationDate'),
                'total_contracts': len(contracts),
                'total_contract_value': total_value,
                'active_contracts': len([c for c in contracts if c.get('status') == 'active']),
                'completed_contracts': len(completed_contracts),
                'average_performance_rating': data.get('averagePerformanceRating'),
                'integrity_status': data.get('integrityStatus'),  # Integrity regime check
                'security_clearance_level': data.get('securityClearanceLevel'),
                'recent_contracts': contracts[:10]  # Last 10 for pattern analysis
            }
    
    async def _verify_provincial(self, business_number: str, system: SystemCode, 
                                endpoint: SystemEndpoint, headers: Dict) -> Dict:
        """
        Verify with provincial corporate registries
        Each province has different data formats
        """
        if system == SystemCode.ON_ONBIS:
            # Ontario Business Information System
            async with self.session.get(
                f"{endpoint.base_url}/corporation/{business_number}",
                headers=headers,
                timeout=endpoint.timeout
            ) as response:
                data = await response.json()
                
                return {
                    'system': 'ON_ONBIS',
                    'ontario_corp_number': data.get('ontarioCorporationNumber'),
                    'business_name': data.get('businessName'),
                    'business_status': data.get('status'),
                    'registration_date': data.get('registrationDate'),
                    'business_activity': data.get('primaryActivity'),
                    'registered_address': data.get('registeredAddress'),
                    'directors': self._encrypt_sensitive_data(data.get('directors', []))
                }
                
        elif system == SystemCode.QC_REQ:
            # Quebec Registraire des entreprises
            # Quebec uses XML responses
            async with self.session.get(
                f"{endpoint.base_url}/entreprise/{business_number}",
                headers=headers,
                timeout=endpoint.timeout
            ) as response:
                xml_data = await response.text()
                data = xmltodict.parse(xml_data)['entreprise']
                
                return {
                    'system': 'QC_REQ',
                    'neq': data.get('NEQ'),  # Numéro d'entreprise du Québec
                    'nom_entreprise': data.get('nomEntreprise'),
                    'statut': data.get('statut'),
                    'date_immatriculation': data.get('dateImmatriculation'),
                    'forme_juridique': data.get('formeJuridique'),
                    'adresse_domicile': data.get('adresseDomicile'),
                    'administrateurs': self._encrypt_sensitive_data(data.get('administrateurs', []))
                }
    
    def _determine_relevant_systems(self, business_number: str) -> List[SystemCode]:
        """
        Determine which systems to check based on business number format
        and registration jurisdiction
        """
        systems = [
            SystemCode.CRA,  # Always check CRA
            SystemCode.ISED,  # Always check federal incorporation
            SystemCode.ISC,  # Always check Indigenous certification
            SystemCode.PSPC  # Always check procurement history
        ]
        
        # Add provincial systems based on business location or registration
        # This would be enhanced with actual jurisdiction detection
        if business_number.startswith('1'):  # Ontario corporations often start with 1
            systems.append(SystemCode.ON_ONBIS)
        elif business_number.startswith('3'):  # Quebec corporations
            systems.append(SystemCode.QC_REQ)
            
        return systems
    
    def _merge_verification_data(self, consolidated: Dict, new_data: Dict):
        """Merge verification data from multiple systems"""
        system = new_data.get('system')
        
        # Create system-specific section
        if system not in consolidated:
            consolidated[system] = {}
            
        # Merge data
        for key, value in new_data.items():
            if key != 'system':
                consolidated[system][key] = value
    
    def _check_data_inconsistencies(self, consolidated: Dict, new_data: Dict, system: SystemCode) -> List[str]:
        """
        Check for inconsistencies between different government systems
        These are red flags for phantom partnerships
        """
        red_flags = []
        
        # Check address consistency
        if 'CRA' in consolidated and system == SystemCode.ISED:
            cra_address = consolidated['CRA'].get('physical_address', {})
            ised_address = new_data.get('registered_office', {})
            
            if cra_address and ised_address:
                if self._normalize_address(cra_address) != self._normalize_address(ised_address):
                    red_flags.append("Inconsistent addresses between CRA and ISED records")
        
        # Check business status consistency
        if 'CRA' in consolidated and new_data.get('system') in ['ISED', 'ON_ONBIS', 'QC_REQ']:
            cra_status = consolidated['CRA'].get('business_status')
            other_status = new_data.get('business_status') or new_data.get('corporate_status') or new_data.get('statut')
            
            if cra_status == 'active' and other_status in ['dissolved', 'inactive', 'fermée']:
                red_flags.append(f"Business active with CRA but {other_status} with {new_data['system']}")
        
        # Check Indigenous certification vs ownership claims
        if 'ISC' in consolidated and 'ISED' in consolidated:
            isc_percentage = consolidated['ISC'].get('indigenous_ownership_percentage', 0)
            
            # Check if directors match Indigenous verified owners
            if isc_percentage >= 51:
                verified_owners = set(consolidated['ISC'].get('verified_owners', []))
                all_directors = set(consolidated['ISED'].get('directors', []))
                
                if verified_owners and all_directors:
                    overlap = len(verified_owners.intersection(all_directors))
                    if overlap < len(all_directors) / 2:
                        red_flags.append("Majority Indigenous ownership but minority Indigenous directors")
        
        return red_flags
    
    def _calculate_verification_score(self, results: Dict) -> float:
        """
        Calculate overall verification score based on systems checked and red flags
        """
        base_score = 1.0
        
        # Reduce score for each system that couldn't be checked
        expected_systems = 4  # CRA, ISED, ISC, PSPC minimum
        checked_systems = len(results['systems_checked'])
        base_score -= (expected_systems - checked_systems) * 0.1
        
        # Reduce score for each red flag
        base_score -= len(results['red_flags']) * 0.15
        
        # Ensure score stays between 0 and 1
        return max(0.0, min(1.0, base_score))
    
    def _normalize_address(self, address: Dict) -> str:
        """Normalize address for comparison"""
        # Simple normalization - in production would use Canada Post API
        parts = [
            address.get('streetNumber', ''),
            address.get('streetName', '').upper(),
            address.get('city', '').upper(),
            address.get('province', '').upper(),
            address.get('postalCode', '').upper().replace(' ', '')
        ]
        return '|'.join(parts)
    
    def _encrypt_sensitive_data(self, data: List) -> List:
        """Encrypt sensitive personal information"""
        # In production, would encrypt director names, SINs, etc.
        return data  # Simplified for example
    
    async def _get_auth_headers(self, system: SystemCode) -> Dict:
        """Get authentication headers for each system"""
        endpoint = self.endpoints[system]
        
        if endpoint.auth_type == 'oauth2':
            # OAuth2 flow - would implement full flow
            token = await self._get_oauth_token(system)
            return {'Authorization': f'Bearer {token}'}
            
        elif endpoint.auth_type == 'api_key':
            # API key from secure storage
            api_key = await self._get_api_key(system)
            return {'X-API-Key': api_key}
            
        elif endpoint.auth_type == 'certificate':
            # Client certificate auth
            return {'X-Client-Certificate': await self._get_client_cert(system)}
    
    async def _get_oauth_token(self, system: SystemCode) -> str:
        """Get OAuth token for system (implement token refresh logic)"""
        # Simplified - would implement full OAuth2 flow with refresh
        return "mock_oauth_token"
    
    async def _get_api_key(self, system: SystemCode) -> str:
        """Get API key from secure storage"""
        # Would fetch from secure key management service
        return "mock_api_key"
    
    async def _get_client_cert(self, system: SystemCode) -> str:
        """Get client certificate for mutual TLS"""
        # Would fetch from secure certificate store
        return "mock_client_cert"
    
    async def _store_verification_results(self, business_number: str, results: Dict):
        """Store verification results in database for audit trail"""
        # Store the verification results with encryption of sensitive data
        query = """
            INSERT INTO federal_system_data (
                business_id, system_code, external_id, 
                data_snapshot, data_hash, last_sync_at, sync_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (business_id, system_code) 
            DO UPDATE SET 
                data_snapshot = EXCLUDED.data_snapshot,
                data_hash = EXCLUDED.data_hash,
                last_sync_at = EXCLUDED.last_sync_at,
                sync_status = EXCLUDED.sync_status
        """
        
        # Create hash of data for change detection
        data_hash = hashlib.sha256(
            json.dumps(results, sort_keys=True).encode()
        ).hexdigest()
        
        # Execute for each system checked
        for system in results['systems_checked']:
            await self.db.execute(
                query,
                business_number,  # Would map to business_id
                system,
                business_number,
                json.dumps(results['consolidated_data'].get(system, {})),
                data_hash,
                datetime.utcnow(),
                'success'
            )
    
    async def _log_integration(self, system: SystemCode, business_number: str, 
                             success: bool, error: Optional[str]):
        """Log integration attempt for audit trail"""
        query = """
            INSERT INTO integration_logs (
                business_id, system_code, action_type, 
                success, error_message, initiated_at, completed_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        """
        
        await self.db.execute(
            query,
            business_number,  # Would map to business_id
            system.value,
            'verify',
            success,
            error,
            datetime.utcnow(),
            datetime.utcnow()
        )


# Advanced Analytics Use Cases
class PatternDetectionAnalytics:
    """
    Advanced analytics for detecting phantom partnerships and fraud patterns
    """
    
    def __init__(self, db_connection):
        self.db = db_connection
    
    async def detect_phantom_partnerships(self) -> List[Dict]:
        """
        Use Case 1: Detect phantom partnerships using multi-system analysis
        """
        query = """
            WITH suspicious_patterns AS (
                -- Pattern 1: High revenue per employee
                SELECT 
                    b.id,
                    b.business_number,
                    b.legal_name,
                    'high_revenue_per_employee' as pattern_type,
                    fc.total_contract_value / NULLIF(er.total_employees, 0) as revenue_per_employee,
                    0.8 as confidence_score
                FROM indigenous_businesses b
                JOIN employment_records er ON b.id = er.business_id
                JOIN (
                    SELECT business_id, SUM(contract_value) as total_contract_value
                    FROM federal_contracts
                    WHERE award_date >= CURRENT_DATE - INTERVAL '2 years'
                    GROUP BY business_id
                ) fc ON b.id = fc.business_id
                WHERE fc.total_contract_value / NULLIF(er.total_employees, 0) > 500000
                
                UNION ALL
                
                -- Pattern 2: Shared addresses with non-Indigenous companies
                SELECT 
                    b1.id,
                    b1.business_number,
                    b1.legal_name,
                    'shared_address_suspicious' as pattern_type,
                    COUNT(DISTINCT b2.id) as related_businesses,
                    0.9 as confidence_score
                FROM indigenous_businesses b1
                JOIN federal_system_data f1 ON b1.id = f1.business_id
                JOIN federal_system_data f2 ON 
                    f1.data_snapshot->>'physical_address' = f2.data_snapshot->>'physical_address'
                    AND f1.business_id != f2.business_id
                JOIN indigenous_businesses b2 ON f2.business_id = b2.id
                WHERE f1.system_code = 'CRA'
                GROUP BY b1.id, b1.business_number, b1.legal_name
                HAVING COUNT(DISTINCT b2.id) > 2
                
                UNION ALL
                
                -- Pattern 3: Ownership changes before major contracts
                SELECT 
                    b.id,
                    b.business_number,
                    b.legal_name,
                    'suspicious_ownership_timing' as pattern_type,
                    EXTRACT(days FROM fc.award_date - os.effective_from) as days_before_contract,
                    0.7 as confidence_score
                FROM indigenous_businesses b
                JOIN ownership_structure os ON b.id = os.business_id
                JOIN federal_contracts fc ON b.id = fc.business_id
                WHERE os.effective_from > fc.award_date - INTERVAL '90 days'
                    AND os.effective_from < fc.award_date
                    AND fc.contract_value > 1000000
            )
            INSERT INTO pattern_detections (
                pattern_type, pattern_name, confidence_score,
                primary_business_id, evidence_summary, 
                detection_algorithm, algorithm_version
            )
            SELECT 
                pattern_type,
                pattern_type || '_' || business_number,
                confidence_score,
                id,
                'Automated detection: ' || pattern_type,
                'multi_system_analysis',
                '1.0'
            FROM suspicious_patterns
            WHERE NOT EXISTS (
                SELECT 1 FROM pattern_detections pd
                WHERE pd.primary_business_id = suspicious_patterns.id
                    AND pd.pattern_type = suspicious_patterns.pattern_type
                    AND pd.detected_at > CURRENT_DATE - INTERVAL '30 days'
            );
        """
        
        await self.db.execute(query)
        
        # Return detected patterns for review
        return await self.db.fetch("""
            SELECT * FROM pattern_detections 
            WHERE detected_at >= CURRENT_DATE - INTERVAL '24 hours'
            ORDER BY confidence_score DESC
        """)
    
    async def analyze_network_relationships(self) -> Dict:
        """
        Use Case 2: Network analysis to find connected phantom businesses
        """
        query = """
            -- Find businesses with suspicious relationship networks
            WITH relationship_network AS (
                -- Direct relationships through shared ownership
                SELECT 
                    b1.id as business_a,
                    b2.id as business_b,
                    'shared_ownership' as relationship_type,
                    COUNT(DISTINCT os1.owner_identifier) as shared_owners
                FROM ownership_structure os1
                JOIN ownership_structure os2 ON 
                    os1.owner_identifier = os2.owner_identifier
                    AND os1.business_id != os2.business_id
                JOIN indigenous_businesses b1 ON os1.business_id = b1.id
                JOIN indigenous_businesses b2 ON os2.business_id = b2.id
                WHERE os1.effective_to IS NULL 
                    AND os2.effective_to IS NULL
                GROUP BY b1.id, b2.id
                
                UNION ALL
                
                -- Relationships through shared directors
                SELECT 
                    f1.business_id as business_a,
                    f2.business_id as business_b,
                    'shared_directors' as relationship_type,
                    COUNT(*) as shared_count
                FROM federal_system_data f1
                JOIN federal_system_data f2 ON f1.business_id < f2.business_id
                WHERE f1.system_code = 'ISED' 
                    AND f2.system_code = 'ISED'
                    AND f1.data_snapshot->'directors' ?| ARRAY(
                        SELECT jsonb_array_elements_text(f2.data_snapshot->'directors')
                    )
                GROUP BY f1.business_id, f2.business_id
            ),
            suspicious_networks AS (
                SELECT 
                    business_a,
                    COUNT(DISTINCT business_b) as connected_businesses,
                    COUNT(DISTINCT relationship_type) as relationship_types,
                    STRING_AGG(DISTINCT relationship_type, ', ') as relationships
                FROM relationship_network
                GROUP BY business_a
                HAVING COUNT(DISTINCT business_b) >= 3  -- Connected to 3+ other businesses
            )
            SELECT 
                b.business_number,
                b.legal_name,
                sn.connected_businesses,
                sn.relationships,
                b.risk_score
            FROM suspicious_networks sn
            JOIN indigenous_businesses b ON sn.business_a = b.id
            ORDER BY connected_businesses DESC, b.risk_score DESC
        """
        
        results = await self.db.fetch(query)
        
        return {
            'network_analysis_timestamp': datetime.utcnow().isoformat(),
            'suspicious_networks_found': len(results),
            'networks': [dict(r) for r in results]
        }
    
    async def predict_verification_failures(self) -> List[Dict]:
        """
        Use Case 3: Predict which businesses are likely to fail future verifications
        """
        query = """
            WITH risk_indicators AS (
                SELECT 
                    b.id,
                    b.business_number,
                    b.legal_name,
                    b.risk_score as current_risk_score,
                    
                    -- Risk Factor 1: Declining Indigenous employment ratio
                    LAG(er.indigenous_employees::FLOAT / NULLIF(er.total_employees, 0), 1) 
                        OVER (PARTITION BY b.id ORDER BY er.reporting_period) -
                    (er.indigenous_employees::FLOAT / NULLIF(er.total_employees, 0)) 
                        as indigenous_ratio_decline,
                    
                    -- Risk Factor 2: Increasing subcontracting to parent
                    AVG(fc.subcontracted_amount / NULLIF(fc.contract_value, 0)) 
                        OVER (PARTITION BY b.id) as avg_subcontract_ratio,
                    
                    -- Risk Factor 3: Pattern detection hits
                    COUNT(pd.id) as pattern_detection_count,
                    
                    -- Risk Factor 4: Failed verification checks
                    SUM(CASE WHEN vc.passed = false THEN 1 ELSE 0 END) as failed_checks
                    
                FROM indigenous_businesses b
                LEFT JOIN employment_records er ON b.id = er.business_id
                LEFT JOIN federal_contracts fc ON b.id = fc.business_id
                LEFT JOIN pattern_detections pd ON b.id = pd.primary_business_id
                LEFT JOIN verification_sessions vs ON b.id = vs.business_id
                LEFT JOIN verification_checks vc ON vs.id = vc.session_id
                WHERE b.is_active = true
                GROUP BY b.id, b.business_number, b.legal_name, b.risk_score, 
                         er.indigenous_employees, er.total_employees, er.reporting_period
            ),
            risk_scores AS (
                SELECT 
                    *,
                    -- Calculate predictive risk score
                    LEAST(1.0, 
                        current_risk_score + 
                        COALESCE(indigenous_ratio_decline * 0.3, 0) +
                        COALESCE(avg_subcontract_ratio * 0.2, 0) +
                        (pattern_detection_count * 0.1) +
                        (failed_checks * 0.05)
                    ) as predicted_risk_score
                FROM risk_indicators
            )
            SELECT 
                business_number,
                legal_name,
                current_risk_score,
                predicted_risk_score,
                predicted_risk_score - current_risk_score as risk_increase,
                CASE 
                    WHEN predicted_risk_score > 0.7 THEN 'High Risk - Immediate Review Required'
                    WHEN predicted_risk_score > 0.5 THEN 'Medium Risk - Schedule Review'
                    ELSE 'Low Risk - Standard Monitoring'
                END as recommendation
            FROM risk_scores
            WHERE predicted_risk_score > current_risk_score + 0.1  -- Significant risk increase
            ORDER BY predicted_risk_score DESC
            LIMIT 50
        """
        
        results = await self.db.fetch(query)
        return [dict(r) for r in results]
    
    async def calculate_program_savings(self) -> Dict:
        """
        Use Case 4: Calculate actual savings from preventing phantom partnerships
        """
        query = """
            WITH prevented_contracts AS (
                SELECT 
                    b.id,
                    b.business_number,
                    b.legal_name,
                    b.verification_status,
                    b.risk_score,
                    SUM(fc.contract_value) as total_contract_value,
                    COUNT(fc.id) as contract_count
                FROM indigenous_businesses b
                JOIN federal_contracts fc ON b.id = fc.business_id
                WHERE b.verification_status IN ('rejected', 'suspicious')
                    AND fc.award_date >= b.last_verified_date
                    AND fc.completion_status IS NULL  -- Not yet completed
                GROUP BY b.id, b.business_number, b.legal_name, b.verification_status, b.risk_score
            ),
            monthly_savings AS (
                SELECT 
                    DATE_TRUNC('month', vs.completed_at) as month,
                    COUNT(DISTINCT vs.business_id) as businesses_flagged,
                    SUM(pc.total_contract_value) as contracts_prevented,
                    AVG(b.risk_score) as avg_risk_score
                FROM verification_sessions vs
                JOIN indigenous_businesses b ON vs.business_id = b.id
                LEFT JOIN prevented_contracts pc ON b.id = pc.id
                WHERE vs.final_status IN ('rejected', 'suspicious')
                    AND vs.completed_at >= CURRENT_DATE - INTERVAL '12 months'
                GROUP BY DATE_TRUNC('month', vs.completed_at)
            )
            SELECT 
                TO_CHAR(month, 'YYYY-MM') as month,
                businesses_flagged,
                COALESCE(contracts_prevented, 0) as contracts_prevented,
                avg_risk_score,
                SUM(COALESCE(contracts_prevented, 0)) OVER (ORDER BY month) as cumulative_savings
            FROM monthly_savings
            ORDER BY month DESC
        """
        
        savings_data = await self.db.fetch(query)
        
        # Calculate additional metrics
        total_query = """
            SELECT 
                COUNT(DISTINCT b.id) as total_rejected,
                SUM(fc.contract_value) as total_prevented,
                AVG(b.risk_score) as avg_risk_score
            FROM indigenous_businesses b
            JOIN federal_contracts fc ON b.id = fc.business_id
            WHERE b.verification_status = 'rejected'
                AND fc.award_date >= b.last_verified_date - INTERVAL '30 days'
        """
        
        totals = await self.db.fetchrow(total_query)
        
        return {
            'analysis_date': datetime.utcnow().isoformat(),
            'total_businesses_rejected': totals['total_rejected'],
            'total_contracts_prevented': float(totals['total_prevented'] or 0),
            'average_risk_score': float(totals['avg_risk_score'] or 0),
            'monthly_breakdown': [dict(r) for r in savings_data],
            'projected_annual_savings': float(totals['total_prevented'] or 0) * 12 / len(savings_data)
        }
    
    async def generate_compliance_metrics(self) -> Dict:
        """
        Use Case 5: Generate compliance metrics for government reporting
        """
        query = """
            WITH department_metrics AS (
                SELECT 
                    fc.department_code,
                    COUNT(DISTINCT fc.business_id) as total_indigenous_suppliers,
                    COUNT(DISTINCT CASE 
                        WHEN b.verification_status = 'verified' 
                        THEN fc.business_id 
                    END) as verified_suppliers,
                    COUNT(DISTINCT CASE 
                        WHEN b.verification_status IN ('rejected', 'suspicious') 
                        THEN fc.business_id 
                    END) as flagged_suppliers,
                    SUM(fc.contract_value) as total_contract_value,
                    SUM(CASE 
                        WHEN b.verification_status = 'verified' 
                        THEN fc.contract_value 
                        ELSE 0 
                    END) as verified_contract_value,
                    AVG(b.risk_score) as avg_supplier_risk
                FROM federal_contracts fc
                JOIN indigenous_businesses b ON fc.business_id = b.id
                WHERE fc.award_date >= CURRENT_DATE - INTERVAL '1 year'
                GROUP BY fc.department_code
            )
            SELECT 
                dm.*,
                rd.name_en as department_name,
                ROUND(100.0 * verified_suppliers / NULLIF(total_indigenous_suppliers, 0), 1) as verification_rate,
                ROUND(100.0 * verified_contract_value / NULLIF(total_contract_value, 0), 1) as verified_value_percentage
            FROM department_metrics dm
            JOIN reference_federal_departments rd ON dm.department_code = rd.code
            ORDER BY total_contract_value DESC
        """
        
        department_data = await self.db.fetch(query)
        
        # Overall metrics
        overall_query = """
            SELECT 
                COUNT(DISTINCT b.id) as total_businesses,
                COUNT(DISTINCT CASE WHEN b.verification_status = 'verified' THEN b.id END) as verified_businesses,
                AVG(b.risk_score) as overall_risk_score,
                COUNT(DISTINCT vs.id) as total_verifications_performed,
                AVG(EXTRACT(epoch FROM vs.completed_at - vs.started_at) / 60) as avg_verification_time_minutes
            FROM indigenous_businesses b
            LEFT JOIN verification_sessions vs ON b.id = vs.business_id
            WHERE b.is_active = true
        """
        
        overall = await self.db.fetchrow(overall_query)
        
        return {
            'report_generated': datetime.utcnow().isoformat(),
            'overall_metrics': dict(overall),
            'department_breakdown': [dict(r) for r in department_data],
            'compliance_rate': float(overall['verified_businesses']) / float(overall['total_businesses']) * 100
        }


# Usage example
async def main():
    """Example usage of the government integration system"""
    
    # Initialize database connection (mock)
    db_connection = None  # Would be actual database connection
    
    # Generate encryption key (in production, use key management service)
    encryption_key = Fernet.generate_key()
    
    # Initialize integrator
    async with GovernmentSystemIntegrator(db_connection, encryption_key) as integrator:
        # Verify a business
        business_number = "123456789RC0001"
        verification_results = await integrator.verify_