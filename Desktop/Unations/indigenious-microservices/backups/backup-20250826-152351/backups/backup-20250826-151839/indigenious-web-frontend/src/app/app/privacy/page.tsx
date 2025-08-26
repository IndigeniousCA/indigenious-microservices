import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Indigenous Procurement Platform',
  description: 'Our commitment to protecting your privacy and respecting Indigenous data sovereignty',
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-sm text-gray-600 mb-8">Effective Date: January 30, 2025</p>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Our Commitment to Indigenous Data Sovereignty</h2>
              <p className="text-gray-700 mb-4">
                The Indigenous Procurement Platform recognizes and respects the inherent rights of Indigenous peoples to govern the collection, ownership, and application of their own data. We are committed to upholding the principles of OCAP® (Ownership, Control, Access, and Possession) and CARE (Collective benefit, Authority to control, Responsibility, and Ethics) in all our data practices.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Information We Collect</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Business Information</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Business name, registration number, and contact details</li>
                <li>Indigenous ownership percentage and verification documents</li>
                <li>Nation/Band affiliation and membership numbers</li>
                <li>Business capabilities, certifications, and industry classifications</li>
                <li>Financial information necessary for procurement processes</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 User Account Information</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Name, email address, and role within the organization</li>
                <li>Authentication credentials (securely hashed)</li>
                <li>Communication preferences</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Procurement Data</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>RFQ responses and bid submissions</li>
                <li>Contracts and project deliverables</li>
                <li>Performance metrics and feedback</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. How We Use Your Information</h2>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Facilitate connections between Indigenous businesses and procurement opportunities</li>
                <li>Verify Indigenous business status and maintain platform integrity</li>
                <li>Process bids and manage procurement workflows</li>
                <li>Generate aggregated insights to support Indigenous economic development</li>
                <li>Comply with legal requirements and government procurement regulations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. Data Sharing and Disclosure</h2>
              <p className="text-gray-700 mb-4">
                We do not sell, rent, or trade your personal information. We may share information only in the following circumstances:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>With government departments for procurement processes (with your consent)</li>
                <li>With Indigenous governance bodies as required for verification</li>
                <li>With service providers who assist in platform operations (under strict confidentiality agreements)</li>
                <li>When required by law or to protect the rights and safety of our users</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Indigenous Data Governance</h2>
              <p className="text-gray-700 mb-4">
                In recognition of Indigenous data sovereignty:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Indigenous communities retain ownership of their collective data</li>
                <li>Data portability options allow communities to export their data at any time</li>
                <li>We provide transparency reports on data usage to Indigenous governance bodies</li>
                <li>Community representatives have oversight roles in our data governance structure</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Data Security</h2>
              <p className="text-gray-700 mb-4">
                We implement industry-leading security measures including:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>End-to-end encryption for all data transmission</li>
                <li>Encryption at rest for stored data</li>
                <li>Multi-factor authentication requirements</li>
                <li>Regular security audits and penetration testing</li>
                <li>Compliance with government security standards</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Data Retention</h2>
              <p className="text-gray-700 mb-4">
                We retain data only as long as necessary for business purposes or legal requirements:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Active business profiles: Retained while account is active</li>
                <li>Procurement records: 7 years as required by government regulations</li>
                <li>Verification documents: 2 years after expiration</li>
                <li>Deleted account data: Removed within 90 days</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Your Rights</h2>
              <p className="text-gray-700 mb-4">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Access your personal information</li>
                <li>Correct inaccurate data</li>
                <li>Request deletion of your data (subject to legal obligations)</li>
                <li>Export your data in a portable format</li>
                <li>Opt-out of non-essential communications</li>
                <li>Lodge complaints with privacy authorities</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Special Provisions for Minors</h2>
              <p className="text-gray-700 mb-4">
                Our platform is not intended for users under 18 years of age. We do not knowingly collect information from minors.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                All data is stored within Canada to ensure compliance with Canadian privacy laws and respect for Indigenous data sovereignty. We do not transfer data internationally without explicit consent.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Updates to This Policy</h2>
              <p className="text-gray-700 mb-4">
                We may update this policy to reflect changes in our practices or legal requirements. Significant changes will be communicated to all users with at least 30 days notice.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Contact Information</h2>
              <p className="text-gray-700 mb-4">
                For privacy-related inquiries or to exercise your rights:
              </p>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Privacy Officer</strong><br />
                  Indigenous Procurement Platform<br />
                  Email: privacy@indigenious.ca<br />
                  Phone: 1-888-XXX-XXXX<br />
                  Traditional Territory: [Territory Name]
                </p>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Accountability</h2>
              <p className="text-gray-700">
                We are accountable to the Indigenous communities we serve. Our data practices are overseen by an Indigenous Data Governance Council comprising representatives from various Nations and communities across Canada.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}