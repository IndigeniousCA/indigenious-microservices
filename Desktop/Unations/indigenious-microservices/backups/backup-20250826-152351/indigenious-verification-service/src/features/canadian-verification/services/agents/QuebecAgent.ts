/**
 * Quebec Provincial Verification Agent
 * 
 * @module QuebecAgent
 * @description Verifies businesses in Quebec with bilingual support
 */

import { z } from 'zod';
import crypto from 'crypto';
import { BaseProvincialAgent } from './BaseAgent';
import { 
  VerificationRequest, 
  ProvincialVerificationResult,
  Worker,
  Certification 
} from '../../types';
import {
  ProvincialTaxDebt,
  TaxDebtVerificationRequest,
  ProvincialTaxDebtSchema,
  TaxDebtItemSchema
} from '../../types/tax-debt';
import {
  ProvincialTaxDebtRequestSchema
} from '../../schemas/tax-debt.schema';

/**
 * Quebec verification agent
 * Integrates with Registraire des entreprises du Québec, CNESST, CCQ, Revenu Québec, and RBQ
 */
export class QuebecAgent extends BaseProvincialAgent {
  constructor() {
    super('QC');
    this.initializeAPIs();
  }
  
  /**
   * Initialize Quebec-specific APIs with bilingual support
   */
  private initializeAPIs(): void {
    // Registraire des entreprises du Québec (REQ)
    this.apis.set('req', {
      client: this.createSecureClient(
        process.env.QC_REQ_URL || 'https://www.registreentreprises.gouv.qc.ca/api',
        {
          apiKey: process.env.QC_REQ_API_KEY,
          headers: {
            'Accept-Language': 'fr-CA,en-CA',
            'X-REQ-Partner': 'Approvisionnement-Autochtone'
          }
        }
      ),
      
      rechercherEntreprise: async (nom: string, neq?: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('req').client.post('/entreprises/rechercher', {
            criteres: {
              nom: this.sanitizeInput(nom),
              neq: neq ? this.sanitizeInput(neq) : undefined,
              statut: ['Immatriculée', 'Active']
            },
            langue: 'fr'
          });
          
          return this.validateREQResponse(response.data);
        }, 'req:rechercher');
      },
      
      obtenirDetailsEntreprise: async (neq: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('req').client.get(
            `/entreprises/${this.sanitizeInput(neq)}/details`
          );
          
          return this.validateEntrepriseDetails(response.data);
        }, 'req:details');
      }
    });
    
    // Commission des normes, de l'équité, de la santé et de la sécurité du travail (CNESST)
    this.apis.set('cnesst', {
      client: this.createSecureClient(
        process.env.CNESST_URL || 'https://www.cnesst.gouv.qc.ca/api',
        {
          apiKey: process.env.CNESST_API_KEY,
          headers: {
            'X-CNESST-Version': '2.0',
            'Accept-Language': 'fr-CA'
          }
        }
      ),
      
      verifierConformite: async (numeroClient: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('cnesst').client.post('/conformite/verifier', {
            numeroClient: this.sanitizeInput(numeroClient),
            typeVerification: 'complete',
            inclureHistorique: true
          });
          
          if (response.status === 404) {
            return { 
              conforme: false,
              raison: 'Compte non trouvé',
              compteExiste: false 
            };
          }
          
          return {
            conforme: response.data.statutConformite === 'Conforme',
            numeroAttestation: response.data.numeroAttestation,
            dateEmission: new Date(response.data.dateEmission),
            dateExpiration: new Date(response.data.dateExpiration),
            secteurActivite: response.data.secteurActivite,
            tauxPrime: response.data.tauxPrime,
            mutuellePrevention: response.data.mutuellePrevention,
            compteExiste: true
          };
        }, 'cnesst:conformite');
      }
    });
    
    // Commission de la construction du Québec (CCQ)
    this.apis.set('ccq', {
      client: this.createSecureClient(
        process.env.CCQ_URL || 'https://www.ccq.org/api',
        {
          apiKey: process.env.CCQ_API_KEY,
          headers: {
            'X-CCQ-Partenaire': 'Approvisionnement-Autochtone'
          }
        }
      ),
      
      verifierLicence: async (numeroLicence: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ccq').client.get(
            `/licences/${this.sanitizeInput(numeroLicence)}/statut`
          );
          
          return {
            valide: response.data.statut === 'Valide',
            categorie: response.data.categorie,
            sousCategories: response.data.sousCategories || [],
            dateEmission: new Date(response.data.dateEmission),
            dateExpiration: new Date(response.data.dateExpiration),
            cautionnement: response.data.cautionnement,
            restrictions: response.data.restrictions || []
          };
        }, 'ccq:licence');
      },
      
      verifierCompetence: async (numeroCarteCompetence: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('ccq').client.get(
            `/competences/${this.sanitizeInput(numeroCarteCompetence)}`
          );
          
          return {
            valide: response.data.valide,
            nomTravailleur: response.data.nom,
            metiers: response.data.metiers || [],
            specialites: response.data.specialites || [],
            apprenti: response.data.apprenti,
            compagnon: response.data.compagnon,
            dateExpiration: new Date(response.data.dateExpiration)
          };
        }, 'ccq:competence');
      }
    });
    
    // Revenu Québec - Tax Debt Verification
    this.apis.set('revenuQuebec', {
      client: this.createSecureClient(
        process.env.REVENU_QUEBEC_URL || 'https://api.revenuquebec.ca/verification',
        {
          apiKey: process.env.REVENU_QUEBEC_API_KEY,
          headers: {
            'X-RQ-Service': 'Dette-Fiscale-Verification',
            'X-RQ-Partner': 'Approvisionnement-Autochtone',
            'Accept-Language': 'fr-CA,en-CA',
            'X-Security-Level': 'Enhanced',
            'X-Consent-Required': 'true'
          },
          timeout: 30000 // 30s for complex queries
        }
      ),
      
      verifierDetteFiscale: async (neq: string, consentement: any) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('revenuQuebec').client.post('/dette-fiscale/verifier', {
            neq: this.sanitizeInput(neq),
            typesImpot: [
              'impot_societes', // Corporate income tax
              'tvq', // Quebec Sales Tax
              'retenues_salaires', // Payroll deductions
              'cotisations_fss', // Health Services Fund
              'taxe_capital', // Capital tax (if applicable)
              'droits_specifiques' // Specific duties
            ],
            anneesVerification: 5,
            inclureDetails: true,
            inclureEntentes: true,
            inclureRecours: true,
            consentement: {
              numero: consentement.referenceNumber,
              dateExpiration: consentement.validUntil
            }
          });
          
          return this.transformerReponseDetteFiscale(response.data);
        }, 'revenuQuebec:detteFiscale', 30000);
      },
      
      obtenirDetailsDette: async (neq: string, typeImpot: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('revenuQuebec').client.get(
            `/dette/${this.sanitizeInput(neq)}/${typeImpot}/details`
          );
          
          return {
            typeImpot,
            cotisations: response.data.cotisations || [],
            montantTotal: response.data.soldeTotal || 0,
            plusAncienneDette: response.data.datePlusAncienneCotisation,
            historiqueVersements: response.data.versements || [],
            interetsQuotidiens: response.data.interetsJournaliers || 0
          };
        }, 'revenuQuebec:detailsDette');
      },
      
      verifierEntentePaiement: async (neq: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('revenuQuebec').client.get(
            `/ententes-paiement/${this.sanitizeInput(neq)}/actives`
          );
          
          if (response.status === 404) {
            return { ententeActive: false };
          }
          
          return {
            ententeActive: true,
            ententes: response.data.ententes || [],
            montantTotalSousEntente: response.data.montantTotal || 0,
            conformiteGlobale: response.data.respecteEntentes || false
          };
        }, 'revenuQuebec:ententePaiement');
      },
      
      obtenirStatutRecouvrement: async (neq: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('revenuQuebec').client.get(
            `/recouvrement/${this.sanitizeInput(neq)}/statut`
          );
          
          if (response.status === 404) {
            return { sousRecouvrement: false };
          }
          
          return {
            sousRecouvrement: true,
            etape: response.data.etapeRecouvrement,
            montantTotal: response.data.montantSousRecouvrement,
            mesures: response.data.mesuresRecouvrement || [],
            restrictions: response.data.restrictionsAffaires || []
          };
        }, 'revenuQuebec:recouvrement');
      }
    });
    
    // Régie du bâtiment du Québec (RBQ)
    this.apis.set('rbq', {
      client: this.createSecureClient(
        process.env.RBQ_URL || 'https://www.rbq.gouv.qc.ca/api',
        {
          apiKey: process.env.RBQ_API_KEY,
          headers: {
            'Accept-Language': 'fr-CA,en-CA'
          }
        }
      ),
      
      verifierLicenceEntrepreneur: async (numeroLicence: string) => {
        return this.makeSecureRequest(async () => {
          const response = await this.apis.get('rbq').client.post('/licences/verifier', {
            numeroLicence: this.sanitizeInput(numeroLicence),
            inclureSousCategories: true
          });
          
          return {
            valide: response.data.licenceValide,
            typeEntrepreneur: response.data.type,
            categories: response.data.categories || [],
            cautionnement: response.data.montantCautionnement,
            dateExpiration: new Date(response.data.dateExpiration),
            restrictions: response.data.restrictions || [],
            travailleursQualifies: response.data.travailleursQualifies
          };
        }, 'rbq:licence');
      }
    });
  }
  
  /**
   * Verify Quebec tax debt
   */
  async verifyTaxDebt(request: TaxDebtVerificationRequest): Promise<ProvincialTaxDebt> {
    const startTime = Date.now();
    
    try {
      // Extract NEQ from business number
      const neq = this.extractNEQ(request.businessNumber);
      if (!neq) {
        throw new Error('NEQ requis pour vérification dette fiscale / NEQ required for tax debt verification');
      }
      
      // Verify consent
      if (!request.consent?.obtained || request.consent.expiryDate < new Date()) {
        throw new Error('Consentement valide requis / Valid consent required');
      }
      
      // Log access for audit
      await this.journaliserAccesDetteFiscale({
        typeEvenement: 'demande_acces',
        neq,
        objectif: 'verification_approvisionnement'
      });
      
      // Verify tax debt with Revenu Québec
      const detteFiscale = await this.apis.get('revenuQuebec').verifierDetteFiscale(
        neq,
        request.consent
      );
      
      // Get additional details if significant debt found
      if (detteFiscale.totalProvincialOwing > 10000) {
        const [ententeResult, recouvrementResult] = await Promise.allSettled([
          this.apis.get('revenuQuebec').verifierEntentePaiement(neq),
          this.apis.get('revenuQuebec').obtenirStatutRecouvrement(neq)
        ]);
        
        if (ententeResult.status === 'fulfilled' && ententeResult.value.ententeActive) {
          detteFiscale.paymentArrangement = this.transformerEntentePaiement(ententeResult.value);
        }
        
        if (recouvrementResult.status === 'fulfilled' && recouvrementResult.value.sousRecouvrement) {
          detteFiscale.collectionsStatus = this.transformerStatutRecouvrement(recouvrementResult.value);
        }
      }
      
      // Calculate risk score
      detteFiscale.riskScore = this.calculerScoreRisqueFiscal(detteFiscale);
      
      // Log successful retrieval
      await this.journaliserAccesDetteFiscale({
        typeEvenement: 'donnees_recuperees',
        neq,
        resultat: 'succes',
        scoreRisque: detteFiscale.riskScore
      });
      
      return detteFiscale;
    } catch (error) {
      // Log failure
      await this.journaliserAccesDetteFiscale({
        typeEvenement: 'acces_refuse',
        neq: request.businessNumber,
        resultat: 'echec',
        erreur: error.message
      });
      
      throw new Error(`Vérification dette fiscale échouée: ${error.message}`);
    }
  }
  
  /**
   * Transform Revenu Québec tax debt response
   */
  private transformerReponseDetteFiscale(data: any): ProvincialTaxDebt {
    const result: ProvincialTaxDebt = {
      province: 'QC',
      totalProvincialOwing: 0
    };
    
    // Corporate income tax
    if (data.impotSocietes) {
      result.provincialCorporateTax = {
        items: data.impotSocietes.cotisations.map(this.transformerCotisation),
        totalOwing: data.impotSocietes.soldeTotal || 0,
        filingCompliance: this.transformerConformiteDeclaration(data.impotSocietes.conformite)
      };
      result.totalProvincialOwing += result.provincialCorporateTax.totalOwing;
    }
    
    // Quebec Sales Tax (TVQ)
    if (data.tvq) {
      result.salesTax = {
        items: data.tvq.cotisations.map(this.transformerCotisation),
        totalOwing: data.tvq.soldeTotal || 0,
        registrationNumber: data.tvq.numeroInscription,
        taxType: 'QST',
        filingCompliance: this.transformerConformiteDeclaration(data.tvq.conformite)
      };
      result.totalProvincialOwing += result.salesTax.totalOwing;
    }
    
    // Payroll deductions and other taxes
    const autresImpots = [];
    
    if (data.retenuesSalaires && data.retenuesSalaires.soldeTotal > 0) {
      result.payrollTax = {
        items: data.retenuesSalaires.cotisations.map(this.transformerCotisation),
        totalOwing: data.retenuesSalaires.soldeTotal,
        taxTypes: ['retenues_source', 'rrq', 'rqap', 'fss'],
        filingCompliance: this.transformerConformiteDeclaration(data.retenuesSalaires.conformite)
      };
      result.totalProvincialOwing += result.payrollTax.totalOwing;
    }
    
    // Health Services Fund
    if (data.fss && data.fss.soldeTotal > 0) {
      autresImpots.push({
        taxType: 'health_services_fund',
        items: data.fss.cotisations.map(this.transformerCotisation),
        totalOwing: data.fss.soldeTotal
      });
      result.totalProvincialOwing += data.fss.soldeTotal;
    }
    
    // Capital tax (if applicable)
    if (data.taxeCapital && data.taxeCapital.soldeTotal > 0) {
      autresImpots.push({
        taxType: 'capital_tax',
        items: data.taxeCapital.cotisations.map(this.transformerCotisation),
        totalOwing: data.taxeCapital.soldeTotal
      });
      result.totalProvincialOwing += data.taxeCapital.soldeTotal;
    }
    
    if (autresImpots.length > 0) {
      result.otherTaxes = autresImpots;
    }
    
    // Set last assessment date
    result.lastAssessmentDate = data.dateDerniereEvaluation ? 
      new Date(data.dateDerniereEvaluation) : new Date();
    
    return result;
  }
  
  /**
   * Transform individual tax assessment
   */
  private transformerCotisation(cotisation: any): any {
    return {
      taxType: cotisation.typeImpot,
      amountOwing: cotisation.solde || 0,
      originalAmount: cotisation.montantInitial || 0,
      penaltiesInterest: cotisation.penalitesInterets || 0,
      periodStart: new Date(cotisation.periodeDebut),
      periodEnd: new Date(cotisation.periodeFin),
      dueDate: new Date(cotisation.dateEcheance),
      lastPaymentDate: cotisation.dateDernierVersement ? 
        new Date(cotisation.dateDernierVersement) : undefined,
      filingStatus: cotisation.statutDeclaration || 'filed',
      assessmentNumber: cotisation.numeroAvis,
      yearsOverdue: this.calculerAnneesRetard(cotisation.dateEcheance)
    };
  }
  
  /**
   * Transform filing compliance
   */
  private transformerConformiteDeclaration(conformite: any): any {
    if (!conformite) return undefined;
    
    return {
      taxType: conformite.typeDeclaration,
      currentYear: new Date().getFullYear(),
      filedYears: conformite.anneesProduites || [],
      unfiledYears: conformite.anneesManquantes || [],
      complianceRate: conformite.tauxConformite || 0,
      lastFilingDate: conformite.dateDerniereProduction ? 
        new Date(conformite.dateDerniereProduction) : undefined,
      outstandingReturns: conformite.declarationsManquantes || 0
    };
  }
  
  /**
   * Transform payment arrangement
   */
  private transformerEntentePaiement(entente: any): any {
    const firstArrangement = entente.ententes[0];
    if (!firstArrangement) return undefined;
    
    return {
      arrangementId: firstArrangement.numeroEntente,
      startDate: new Date(firstArrangement.dateDebut),
      endDate: firstArrangement.dateFin ? new Date(firstArrangement.dateFin) : undefined,
      monthlyPayment: firstArrangement.versementMensuel,
      paymentFrequency: firstArrangement.frequence || 'monthly',
      totalAgreedAmount: firstArrangement.montantTotal,
      remainingBalance: firstArrangement.soldeRestant,
      paymentsCompleted: firstArrangement.versementsEffectues || 0,
      paymentsMissed: firstArrangement.versementsManques || 0,
      status: firstArrangement.statut === 'Active' && entente.conformiteGlobale ? 'active' : 'defaulted',
      nextPaymentDue: firstArrangement.prochainVersement ? 
        new Date(firstArrangement.prochainVersement) : undefined,
      complianceRate: firstArrangement.tauxRespect || 0
    };
  }
  
  /**
   * Transform collections status
   */
  private transformerStatutRecouvrement(recouvrement: any): any {
    return {
      stage: this.traduireEtapeRecouvrement(recouvrement.etape),
      assignedOfficer: recouvrement.agentAssigne,
      assignedDate: recouvrement.dateAssignation ? 
        new Date(recouvrement.dateAssignation) : undefined,
      lastContactDate: recouvrement.dernierContact ? 
        new Date(recouvrement.dernierContact) : undefined,
      actions: (recouvrement.mesures || []).map(m => ({
        actionType: this.traduireMesureRecouvrement(m.type),
        actionDate: new Date(m.date),
        actionNumber: m.numeroReference,
        amount: m.montant,
        status: m.statut === 'Actif' ? 'active' : 'satisfied',
        details: m.description
      })),
      totalUnderCollections: recouvrement.montantTotal,
      priorityLevel: this.determinerPrioriteRecouvrement(recouvrement)
    };
  }
  
  /**
   * Calculate tax debt risk score
   */
  private calculerScoreRisqueFiscal(detteFiscale: ProvincialTaxDebt): number {
    let score = 0;
    
    // Amount factor (0-40 points)
    const montantTotal = detteFiscale.totalProvincialOwing;
    if (montantTotal === 0) return 0;
    if (montantTotal > 500000) score += 40;
    else if (montantTotal > 100000) score += 30;
    else if (montantTotal > 50000) score += 20;
    else if (montantTotal > 10000) score += 10;
    else score += 5;
    
    // Payroll deductions factor (0-20 points) - Critical
    if (detteFiscale.payrollTax && detteFiscale.payrollTax.totalOwing > 0) {
      score += Math.min(20, detteFiscale.payrollTax.totalOwing / 5000);
    }
    
    // QST/TVQ factor (0-15 points)
    if (detteFiscale.salesTax && detteFiscale.salesTax.totalOwing > 0) {
      score += Math.min(15, detteFiscale.salesTax.totalOwing / 10000);
    }
    
    // Filing compliance factor (0-15 points)
    const hasUnfiledReturns = 
      detteFiscale.provincialCorporateTax?.filingCompliance?.outstandingReturns > 0 ||
      detteFiscale.salesTax?.filingCompliance?.outstandingReturns > 0;
    if (hasUnfiledReturns) score += 15;
    
    // Collections factor (0-10 points)
    if (detteFiscale.collectionsStatus) {
      switch (detteFiscale.collectionsStatus.stage) {
        case 'legal_action': score += 10; break;
        case 'collections': score += 8; break;
        case 'demand': score += 5; break;
        case 'notice': score += 3; break;
      }
    }
    
    return Math.min(100, score);
  }
  
  /**
   * Main verification method for Quebec
   */
  async verify(request: VerificationRequest): Promise<ProvincialVerificationResult> {
    const verificationId = crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      // Core verification tasks
      const verificationTasks = [
        this.verifyBusinessRegistration(request.businessName, request.businessNumber),
        this.verifySafetyCompliance(request.businessNumber || request.businessName),
        this.verifyTradeQualifications(request.workers || [])
      ];
      
      // Add construction-specific verifications if applicable
      if (this.isConstructionRelated(request)) {
        verificationTasks.push(this.verifyConstructionLicenses(request));
      }
      
      const results = await Promise.allSettled(verificationTasks);
      const [businessResult, safetyResult, tradeResults, constructionResult] = results;
      
      // Calculate confidence
      const confidence = this.calculateConfidence(results);
      
      // Check language compliance
      const languageCompliance = this.assessLanguageCompliance(request);
      
      const result: ProvincialVerificationResult = {
        type: 'provincial',
        province: 'QC',
        verificationId,
        timestamp: new Date(),
        results: {
          business: businessResult.status === 'fulfilled' ? businessResult.value : null,
          safety: safetyResult.status === 'fulfilled' ? safetyResult.value : null,
          trades: tradeResults.status === 'fulfilled' ? tradeResults.value : null,
          construction: constructionResult?.status === 'fulfilled' ? constructionResult.value : null,
          languageCompliance
        },
        confidence,
        errors: this.extractErrors(results)
      };
      
      // Store result
      await this.storeVerificationResult(result);
      
      return result;
    } catch (error) {
      throw new Error(`Vérification Québec échouée / Quebec verification failed: ${error.message}`);
    }
  }
  
  /**
   * Verify business registration in Quebec
   */
  protected async verifyBusinessRegistration(
    businessName: string,
    businessNumber?: string
  ): Promise<any> {
    try {
      // Extract NEQ from business number if provided
      let neq: string | undefined;
      if (businessNumber) {
        // Quebec uses NEQ (Numéro d'entreprise du Québec)
        neq = this.extractNEQ(businessNumber);
      }
      
      // Search for enterprise
      const searchResults = await this.apis.get('req').rechercherEntreprise(
        businessName,
        neq
      );
      
      if (!searchResults.entreprises || searchResults.entreprises.length === 0) {
        return {
          trouve: false,
          found: false,
          message: 'Entreprise non trouvée au REQ / Business not found in REQ'
        };
      }
      
      // Get detailed information
      const entreprise = searchResults.entreprises[0];
      const details = await this.apis.get('req').obtenirDetailsEntreprise(
        entreprise.neq
      );
      
      return {
        trouve: true,
        found: true,
        neq: details.neq,
        nomLegal: details.nomLegal,
        legalName: details.nomLegal,
        autresNoms: details.autresNoms || [],
        statut: details.statut,
        status: this.translateStatus(details.statut),
        dateImmatriculation: details.dateImmatriculation,
        registrationDate: details.dateImmatriculation,
        formeJuridique: details.formeJuridique,
        businessType: this.translateBusinessType(details.formeJuridique),
        adressePrincipale: {
          rue: details.adresse.rue,
          ville: details.adresse.ville,
          province: 'QC',
          codePostal: details.adresse.codePostal
        },
        activitesEconomiques: details.activitesEconomiques || [],
        produitsDeclaration: {
          declarationAnnuelle: details.declarationAnnuelleDeposee,
          derniereMiseAJour: details.dateDerniereMiseAJour
        }
      };
    } catch (error) {
      throw new Error(`Vérification REQ échouée: ${error.message}`);
    }
  }
  
  /**
   * Verify CNESST compliance
   */
  protected async verifySafetyCompliance(businessIdentifier: string): Promise<any> {
    try {
      // Map to CNESST client number
      const numeroClient = await this.mapToCNESSTNumber(businessIdentifier);
      
      const conformite = await this.apis.get('cnesst').verifierConformite(numeroClient);
      
      if (!conformite.compteExiste) {
        return {
          conforme: false,
          compliant: false,
          raison: 'Aucun compte CNESST trouvé / No CNESST account found',
          inscription_requise: true,
          registration_required: true
        };
      }
      
      return {
        conforme: conformite.conforme,
        compliant: conformite.conforme,
        numeroAttestation: conformite.numeroAttestation,
        clearanceNumber: conformite.numeroAttestation,
        dateEmission: conformite.dateEmission,
        issueDate: conformite.dateEmission,
        dateExpiration: conformite.dateExpiration,
        expiryDate: conformite.dateExpiration,
        secteurActivite: conformite.secteurActivite,
        industryCode: conformite.secteurActivite,
        tauxPrime: conformite.tauxPrime,
        premiumRate: conformite.tauxPrime,
        mutuellePrevention: conformite.mutuellePrevention,
        performanceSecurite: this.evaluerPerformanceSecurite(conformite)
      };
    } catch (error) {
      return {
        conforme: false,
        compliant: false,
        erreur: `Vérification CNESST échouée: ${error.message}`
      };
    }
  }
  
  /**
   * Verify trade qualifications for workers
   */
  protected async verifyTradeQualifications(workers: Worker[]): Promise<any> {
    if (!workers || workers.length === 0) {
      return { verifie: true, verified: true, travailleurs: [] };
    }
    
    const quebecWorkers = workers.filter(w => 
      w.provinces.includes('QC') || 
      w.certifications.some(c => c.province === 'QC')
    );
    
    if (quebecWorkers.length === 0) {
      return { 
        verifie: true, 
        verified: true, 
        travailleurs: [], 
        message: 'Aucun travailleur québécois à vérifier / No Quebec workers to verify' 
      };
    }
    
    const verificationPromises = quebecWorkers.flatMap(worker =>
      worker.certifications
        .filter(cert => cert.province === 'QC')
        .map(cert => this.verifyWorkerCertification(worker, cert))
    );
    
    const results = await Promise.allSettled(verificationPromises);
    
    return {
      verifie: results.some(r => r.status === 'fulfilled' && r.value.valide),
      verified: results.some(r => r.status === 'fulfilled' && r.value.valide),
      totalTravailleurs: quebecWorkers.length,
      totalWorkers: quebecWorkers.length,
      certificationsVerifiees: results.filter(
        r => r.status === 'fulfilled' && r.value.valide
      ).length,
      details: results.map(r => 
        r.status === 'fulfilled' ? r.value : { valide: false, erreur: r.reason }
      ),
      metiersReglementes: this.identifierMetiersReglementes(results)
    };
  }
  
  /**
   * Verify individual worker certification
   */
  private async verifyWorkerCertification(
    worker: Worker,
    certification: Certification
  ): Promise<any> {
    try {
      // For construction trades, use CCQ
      if (this.isConstructionTrade(certification.type)) {
        const ccqResult = await this.apis.get('ccq').verifierCompetence(
          certification.number
        );
        
        return {
          nomTravailleur: worker.name,
          workerName: worker.name,
          typeCertification: certification.type,
          certificationType: certification.type,
          numeroCertificat: certification.number,
          certificateNumber: certification.number,
          valide: ccqResult.valide,
          valid: ccqResult.valide,
          metiers: ccqResult.metiers,
          trades: ccqResult.metiers,
          niveau: ccqResult.compagnon ? 'Compagnon' : 'Apprenti',
          level: ccqResult.compagnon ? 'Journeyman' : 'Apprentice',
          dateExpiration: ccqResult.dateExpiration,
          expiryDate: ccqResult.dateExpiration
        };
      }
      
      // For other trades, return basic validation
      return {
        nomTravailleur: worker.name,
        workerName: worker.name,
        typeCertification: certification.type,
        certificationType: certification.type,
        valide: true,
        valid: true,
        message: 'Métier non réglementé par la CCQ / Trade not regulated by CCQ'
      };
    } catch (error) {
      return {
        nomTravailleur: worker.name,
        workerName: worker.name,
        typeCertification: certification.type,
        certificationType: certification.type,
        valide: false,
        valid: false,
        erreur: error.message
      };
    }
  }
  
  /**
   * Verify construction licenses
   */
  private async verifyConstructionLicenses(request: VerificationRequest): Promise<any> {
    try {
      // Extract license numbers from request or lookup
      const licenseNumber = await this.extractLicenseNumber(request);
      
      if (!licenseNumber) {
        return {
          type: 'construction',
          verified: false,
          message: 'Numéro de licence non fourni / License number not provided'
        };
      }
      
      // Verify RBQ license
      const rbqResult = await this.apis.get('rbq').verifierLicenceEntrepreneur(licenseNumber);
      
      // Verify CCQ license if applicable
      let ccqResult = null;
      if (rbqResult.valide && rbqResult.categories.includes('Construction')) {
        ccqResult = await this.apis.get('ccq').verifierLicence(licenseNumber);
      }
      
      return {
        type: 'construction',
        licenceRBQ: {
          valide: rbqResult.valide,
          valid: rbqResult.valide,
          numero: licenseNumber,
          typeEntrepreneur: rbqResult.typeEntrepreneur,
          categories: rbqResult.categories,
          cautionnement: rbqResult.cautionnement,
          dateExpiration: rbqResult.dateExpiration
        },
        licenceCCQ: ccqResult ? {
          valide: ccqResult.valide,
          valid: ccqResult.valide,
          categorie: ccqResult.categorie,
          sousCategories: ccqResult.sousCategories
        } : null,
        conformeConstruction: rbqResult.valide && (!ccqResult || ccqResult.valide),
        constructionCompliant: rbqResult.valide && (!ccqResult || ccqResult.valide)
      };
    } catch (error) {
      return {
        type: 'construction',
        verified: false,
        error: error.message
      };
    }
  }
  
  /**
   * Test primary endpoint for health check
   */
  protected async testPrimaryEndpoint(): Promise<boolean> {
    try {
      const response = await this.apis.get('req').client.get('/sante');
      return response.status === 200;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if business is construction-related
   */
  private isConstructionRelated(request: VerificationRequest): boolean {
    const constructionKeywords = [
      'construction', 'entrepreneur', 'contracteur', 'bâtiment',
      'électricien', 'plombier', 'maçon', 'charpentier'
    ];
    
    const businessNameLower = request.businessName.toLowerCase();
    return constructionKeywords.some(keyword => 
      businessNameLower.includes(keyword)
    );
  }
  
  /**
   * Check if trade is construction trade in Quebec
   */
  private isConstructionTrade(trade: string): boolean {
    const ccqTrades = [
      'briqueteur-maçon', 'calorifugeur', 'carreleur', 'charpentier-menuisier',
      'chaudronnier', 'cimentier-applicateur', 'couvreur', 'électricien',
      'ferblantier', 'ferrailleur', 'frigoriste', 'grutier', 'mécanicien de chantier',
      'mécanicien en protection-incendie', 'monteur-assembleur', 'monteur-mécanicien',
      'opérateur de pelles mécaniques', 'opérateur d\'équipement lourd',
      'peintre', 'plâtrier', 'plombier', 'poseur de revêtements souples',
      'poseur de systèmes intérieurs', 'serrurier de bâtiment', 'soudeur', 'tuyauteur'
    ];
    
    const tradeLower = trade.toLowerCase();
    return ccqTrades.some(t => tradeLower.includes(t));
  }
  
  /**
   * Assess language compliance
   */
  private assessLanguageCompliance(request: VerificationRequest): any {
    // Quebec requires French language compliance
    const hasFrench = request.businessName.match(/[àâäæçéèêëíìîïñóòôöœúùûüýÿ]/i) ||
                     request.workers?.some(w => w.name.match(/[àâäæçéèêëíìîïñóòôöœúùûüýÿ]/i));
    
    return {
      conformeLangue: true, // Assume compliance for now
      languageCompliant: true,
      francaisDisponible: hasFrench,
      frenchAvailable: hasFrench,
      recommandations: !hasFrench ? [
        'Considérez d\'offrir des services en français',
        'Consider offering services in French'
      ] : []
    };
  }
  
  /**
   * Extract NEQ from business number
   */
  private extractNEQ(businessNumber: string): string | undefined {
    // NEQ is typically 10 digits starting with 11
    const neqMatch = businessNumber.match(/11\d{8}/);
    return neqMatch ? neqMatch[0] : undefined;
  }
  
  /**
   * Map to CNESST number
   */
  private async mapToCNESSTNumber(businessIdentifier: string): Promise<string> {
    // Check if already CNESST format
    if (businessIdentifier.match(/^\d{8,10}$/)) {
      return businessIdentifier;
    }
    
    // Extract NEQ and use as base
    const neq = this.extractNEQ(businessIdentifier);
    if (neq) {
      return neq;
    }
    
    // Mock mapping
    const mappings: Record<string, string> = {
      '123456789RC0001': '1123456789',
      '987654321RC0001': '1198765432'
    };
    
    return mappings[businessIdentifier] || businessIdentifier;
  }
  
  /**
   * Extract license number
   */
  private async extractLicenseNumber(request: VerificationRequest): Promise<string | undefined> {
    // Look for RBQ license pattern (####-####-##)
    const licensePattern = /\d{4}-\d{4}-\d{2}/;
    
    // Check in business name or other fields
    const match = request.businessName.match(licensePattern);
    return match ? match[0] : undefined;
  }
  
  /**
   * Evaluate safety performance
   */
  private evaluerPerformanceSecurite(conformite: any): any {
    const taux = conformite.tauxPrime || 1.0;
    
    return {
      evaluation: taux <= 0.8 ? 'Excellente' :
                  taux <= 1.0 ? 'Bonne' :
                  taux <= 1.2 ? 'Moyenne' : 'À améliorer',
      rating: taux <= 0.8 ? 'Excellent' :
              taux <= 1.0 ? 'Good' :
              taux <= 1.2 ? 'Average' : 'Needs Improvement',
      mutuelle: conformite.mutuellePrevention ? 
        'Membre d\'une mutuelle de prévention / Member of prevention mutual' : 
        'Non-membre / Non-member'
    };
  }
  
  /**
   * Identify regulated trades
   */
  private identifierMetiersReglementes(results: PromiseSettledResult<any>[]): string[] {
    return results
      .filter(r => r.status === 'fulfilled' && r.value.metiers)
      .flatMap(r => (r as PromiseFulfilledResult<any>).value.metiers)
      .filter((metier, index, self) => self.indexOf(metier) === index);
  }
  
  /**
   * Translate status to English
   */
  private translateStatus(statut: string): string {
    const translations: Record<string, string> = {
      'Immatriculée': 'Registered',
      'Active': 'Active',
      'Inactive': 'Inactive',
      'Radiée': 'Struck off'
    };
    
    return translations[statut] || statut;
  }
  
  /**
   * Translate business type to English
   */
  private translateBusinessType(formeJuridique: string): string {
    const translations: Record<string, string> = {
      'Société par actions': 'Corporation',
      'Entreprise individuelle': 'Sole Proprietorship',
      'Société en nom collectif': 'General Partnership',
      'Société en commandite': 'Limited Partnership'
    };
    
    return translations[formeJuridique] || formeJuridique;
  }
  
  /**
   * Validate REQ response
   */
  private validateREQResponse(data: any): any {
    const schema = z.object({
      entreprises: z.array(z.object({
        neq: z.string(),
        nom: z.string(),
        statut: z.string(),
        formeJuridique: z.string()
      })),
      nombreResultats: z.number()
    });
    
    return schema.parse(data);
  }
  
  /**
   * Utility methods for tax debt verification
   */
  private calculerAnneesRetard(dateEcheance: string): number {
    const echeance = new Date(dateEcheance);
    const maintenant = new Date();
    const annees = (maintenant.getTime() - echeance.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return Math.max(0, Math.floor(annees));
  }
  
  private traduireEtapeRecouvrement(etape: string): string {
    const mapping = {
      'Avis': 'notice',
      'Mise en demeure': 'demand',
      'Recouvrement': 'collections',
      'Recours judiciaire': 'legal_action',
      'Faillite': 'bankruptcy'
    };
    return mapping[etape] || 'notice';
  }
  
  private traduireMesureRecouvrement(type: string): string {
    const mapping = {
      'Avis de cotisation': 'notice',
      'Mise en demeure': 'demand',
      'Saisie': 'seizure',
      'Hypothèque légale': 'lien',
      'Saisie-arrêt': 'garnishment',
      'Action en justice': 'legal_action'
    };
    return mapping[type] || 'notice';
  }
  
  private determinerPrioriteRecouvrement(recouvrement: any): 'low' | 'medium' | 'high' | 'critical' {
    if (recouvrement.montantTotal > 500000 || recouvrement.etape === 'Recours judiciaire') {
      return 'critical';
    }
    if (recouvrement.montantTotal > 100000 || recouvrement.etape === 'Recouvrement') {
      return 'high';
    }
    if (recouvrement.montantTotal > 50000 || recouvrement.etape === 'Mise en demeure') {
      return 'medium';
    }
    return 'low';
  }
  
  private async journaliserAccesDetteFiscale(entree: any): Promise<void> {
    try {
      const journalAudit = {
        idEvenement: crypto.randomUUID(),
        horodatage: new Date(),
        ...entree
      };
      
      // Store in audit log
      if (this.redis) {
        await this.redis.zadd(
          'dette-fiscale:journal-audit:qc',
          Date.now(),
          JSON.stringify(journalAudit)
        );
      }
    } catch (error) {
      console.error('Échec journalisation accès dette fiscale:', error);
    }
  }
  
  /**
   * Validate enterprise details
   */
  private validateEntrepriseDetails(data: any): any {
    const schema = z.object({
      neq: z.string(),
      nomLegal: z.string(),
      autresNoms: z.array(z.string()).optional(),
      statut: z.string(),
      dateImmatriculation: z.string(),
      formeJuridique: z.string(),
      adresse: z.object({
        rue: z.string(),
        ville: z.string(),
        codePostal: z.string()
      }),
      activitesEconomiques: z.array(z.string()).optional(),
      declarationAnnuelleDeposee: z.boolean(),
      dateDerniereMiseAJour: z.string().optional()
    });
    
    return schema.parse(data);
  }
}