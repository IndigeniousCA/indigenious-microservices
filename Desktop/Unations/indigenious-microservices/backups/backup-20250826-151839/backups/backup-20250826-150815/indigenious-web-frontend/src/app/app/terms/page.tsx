import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service - Indigenous Procurement Platform',
  description: 'Terms and conditions for using the Indigenous Procurement Platform',
}

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-8 md:p-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-sm text-gray-600 mb-8">Effective Date: January 30, 2025</p>
            
            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
              <p className="text-gray-700 mb-4">
                By accessing or using the Indigenous Procurement Platform ("Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the Platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. Platform Purpose</h2>
              <p className="text-gray-700 mb-4">
                The Platform facilitates connections between Indigenous businesses and procurement opportunities from government departments and Indigenous organizations. It supports Canada's commitment to achieving a minimum 5% of federal contracts being awarded to Indigenous businesses.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. Eligibility</h2>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.1 Indigenous Businesses</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Must be at least 51% owned and controlled by Indigenous persons</li>
                <li>Must provide valid verification of Indigenous ownership</li>
                <li>Must maintain accurate and current business information</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.2 Government Users</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Must be authorized representatives of government departments</li>
                <li>Must use valid government email addresses</li>
                <li>Must enable and maintain two-factor authentication</li>
              </ul>

              <h3 className="text-xl font-semibold text-gray-800 mb-3">3.3 Other Businesses</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Non-Indigenous businesses may participate in Band Council opportunities only</li>
                <li>Must accurately represent their business status</li>
                <li>Subject to additional fees and verification requirements</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. User Obligations</h2>
              <p className="text-gray-700 mb-4">You agree to:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Provide accurate, complete, and current information</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Comply with all applicable laws and regulations</li>
                <li>Respect the intellectual property rights of others</li>
                <li>Not misrepresent your Indigenous status or business ownership</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. Prohibited Activities</h2>
              <p className="text-gray-700 mb-4">You may not:</p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Make false claims about Indigenous ownership or affiliation</li>
                <li>Submit fraudulent bids or procurement documents</li>
                <li>Attempt to circumvent Platform security measures</li>
                <li>Harvest or collect data about other users</li>
                <li>Use the Platform for any illegal or unauthorized purpose</li>
                <li>Interfere with or disrupt the Platform's operation</li>
                <li>Transmit viruses, malware, or other harmful code</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Indigenous Status Verification</h2>
              <p className="text-gray-700 mb-4">
                <strong className="text-red-600">IMPORTANT:</strong> False claims of Indigenous status or ownership will result in:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li className="font-semibold">Immediate and permanent ban from the Platform</li>
                <li>Reporting to relevant authorities</li>
                <li>Potential legal action</li>
                <li>Public disclosure of fraudulent activity to protect the integrity of Indigenous procurement</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. Procurement Process</h2>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Government RFQs are visible only to verified Indigenous businesses</li>
                <li>Band Council opportunities may be open to all businesses</li>
                <li>All bids must be submitted before stated deadlines</li>
                <li>Evaluation criteria and weighting will be clearly stated</li>
                <li>Results are final and binding</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. Fees and Payment</h2>
              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.1 Fee Structure</h3>
              <ul className="list-disc pl-6 text-gray-700 mb-4">
                <li>Indigenous SMEs: Free</li>
                <li>Large Indigenous organizations: Subscription fees apply</li>
                <li>Government departments: Licensing fees</li>
                <li>Non-Indigenous businesses: Pay-per-bid model</li>
              </ul>
              
              <h3 className="text-xl font-semibold text-gray-800 mb-3">8.2 Payment Terms</h3>
              <p className="text-gray-700 mb-4">
                All fees are in Canadian dollars and subject to applicable taxes. Payment terms are net 30 days unless otherwise specified.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. Intellectual Property</h2>
              <p className="text-gray-700 mb-4">
                You retain ownership of content you submit. By using the Platform, you grant us a license to use, display, and distribute your content solely for Platform operations. The Platform and its original content are protected by intellectual property laws.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. Privacy and Data Protection</h2>
              <p className="text-gray-700 mb-4">
                Your use of the Platform is subject to our Privacy Policy. We are committed to Indigenous data sovereignty principles and OCAP® compliance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. Disclaimers</h2>
              <p className="text-gray-700 mb-4">
                THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE:
              </p>
              <ul className="list-disc pl-6 text-gray-700 mb-4 uppercase">
                <li>The success of any bid or procurement process</li>
                <li>The accuracy of information provided by other users</li>
                <li>Uninterrupted or error-free Platform operation</li>
                <li>The outcome of business relationships formed through the Platform</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. Limitation of Liability</h2>
              <p className="text-gray-700 mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE PLATFORM.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. Indemnification</h2>
              <p className="text-gray-700 mb-4">
                You agree to indemnify and hold harmless the Platform, its operators, and affiliates from any claims arising from your use of the Platform or violation of these Terms.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. Dispute Resolution</h2>
              <p className="text-gray-700 mb-4">
                We encourage resolution through traditional Indigenous dispute resolution methods where appropriate. Otherwise, disputes shall be resolved through binding arbitration in accordance with the laws of Canada.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. Governing Law</h2>
              <p className="text-gray-700 mb-4">
                These Terms are governed by the laws of Canada and the province of Manitoba, with recognition of Indigenous laws and governance systems where applicable.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. Changes to Terms</h2>
              <p className="text-gray-700 mb-4">
                We may update these Terms from time to time. Material changes will be notified to users with at least 30 days notice. Continued use after changes constitutes acceptance.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">17. Termination</h2>
              <p className="text-gray-700 mb-4">
                We reserve the right to suspend or terminate accounts that violate these Terms. Users may close their accounts at any time, subject to fulfilling any outstanding obligations.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">18. Contact Information</h2>
              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-gray-700">
                  <strong>Legal Department</strong><br />
                  Indigenous Procurement Platform<br />
                  Email: legal@indigenious.ca<br />
                  Phone: 1-888-XXX-XXXX<br />
                  Traditional Territory: [Territory Name]
                </p>
              </div>
            </section>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> These Terms of Service have been developed with input from Indigenous legal experts and community representatives to ensure they reflect Indigenous values and governance principles while meeting Canadian legal requirements.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}