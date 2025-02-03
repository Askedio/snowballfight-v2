export function Terms() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#cce3f5] via-[#a4cde3] to-[#6aa3c8] text-black p-6">
      {/* Terms Container */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg rounded-3xl w-full max-w-3xl h-full flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="flex justify-center p-4">
          <img
            src="/logo.png"
            width="200"
            className="rounded-lg shadow-md shadow-white"
          />
        </div>

        {/* Scrollable Terms Section */}
        <div className="px-6 py-4 overflow-y-auto flex-1 scroll-smooth">
          <h1 className="text-3xl font-bold text-center text-blue-900">Terms of Use</h1>
          <p className="text-center text-gray-600 mb-4">Last Updated: 02/02/2025</p>

          <hr className="border-gray-300 mb-4" />

          <div className="prose max-w-none flex flex-col gap-4">
            <h2 className="text-2xl font-semibold text-blue-800">1. Acceptance of Terms</h2>
            <p>
              By accessing or using <strong>Snowball Fight Online</strong>, you agree to these Terms of Use. 
              If you do not agree, you should not use our services.
            </p>

            <h2 className="text-2xl font-semibold text-blue-800">2. Use of Our Services</h2>
            <p>
              Our services are for lawful use only. You agree not to use them for illegal activities 
              such as fraud, harassment, or intellectual property infringement.
            </p>

            <h2 className="text-2xl font-semibold text-blue-800">3. Account Registration</h2>
            <p>
              You may need an account for certain features. You are responsible for keeping your 
              account information secure and notifying us of any unauthorized access.
            </p>

            <h2 className="text-2xl font-semibold text-blue-800">4. Privacy</h2>
            <p>
              Our <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a> 
              {" "}governs your data usage. By using our services, you agree to our data policies.
            </p>

            <h2 className="text-2xl font-semibold text-blue-800">5. Restrictions</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>You may not reverse engineer or disassemble our services.</li>
              <li>Using our service for unlawful activities is prohibited.</li>
              <li>Do not interfere with or disrupt our services or networks.</li>
            </ul>

            <h2 className="text-2xl font-semibold text-blue-800">6. Termination</h2>
            <p>
              We reserve the right to suspend or terminate your access without notice if you 
              violate these Terms.
            </p>

            <h2 className="text-2xl font-semibold text-blue-800">7. Limitation of Liability</h2>
            <p>
              Snowball Fight Online is not liable for indirect, incidental, or consequential damages.
            </p>

            <h2 className="text-2xl font-semibold text-blue-800">8. Changes to Terms</h2>
            <p>
              We may update these terms. You should review them regularly.
            </p>

            <h2 className="text-2xl font-semibold text-blue-800">9. Governing Law</h2>
            <p>
              These Terms are governed by the laws of California, USA. Any disputes will be handled 
              in California courts.
            </p>

            <h2 className="text-2xl font-semibold text-blue-800">10. Contact Us</h2>
            <p>
              Have questions? Email us at{" "}
              <a href="mailto:will@willbowman.dev" className="text-blue-600 hover:underline">
                will@willbowman.dev
              </a>.
            </p>
          </div>
        </div>

        {/* Accept Button (Sticky) */}
        <div className="p-4 border-t border-gray-300 text-center sticky bottom-0 bg-white/80 backdrop-blur-lg rounded-b-3xl">
          <a href="/" className="bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition hover:bg-blue-800">
            Play Now
          </a>
        </div>
      </div>
    </div>
  );
}
