export function Privacy() {
  return (
    <div className="flex items-center justify-center h-screen bg-gradient-to-br from-[#cce3f5] via-[#a4cde3] to-[#6aa3c8] text-black p-6">
      {/* Privacy Container */}
      <div className="bg-white/80 backdrop-blur-lg shadow-lg rounded-3xl w-full max-w-3xl h-full flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="flex justify-center p-4">
          <img
            src="/logo.png"
            width="200"
            className="rounded-lg shadow-md shadow-white"
          />
        </div>

        {/* Scrollable Privacy Section */}
        <div className="px-6 py-4 overflow-y-auto flex-1 scroll-smooth">
          <h1 className="text-3xl font-bold text-center text-blue-900">Privacy Policy</h1>
          <p className="text-center text-gray-600 mb-4">Last Updated: 02/02/2025</p>

          <hr className="border-gray-300 mb-4" />

          <div className="prose max-w-none flex flex-col gap-4">
            <h2 className="text-2xl font-semibold text-blue-800">1. Introduction</h2>
            <p>
              Welcome to <strong>Snowball Fight Online</strong>. We value your privacy and are
              committed to protecting your personal data.
            </p>

            <h2 className="text-2xl font-semibold text-blue-800">2. Information We Collect</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>Personal Identification Information (Name, Email, Phone Number, etc.)</li>
              <li>Usage Data (IP Address, Browser Type, Pages Visited, etc.)</li>
              <li>Cookies and Tracking Technologies</li>
            </ul>

            <h2 className="text-2xl font-semibold text-blue-800">3. How We Use Your Information</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>Provide, operate, and maintain our services</li>
              <li>Improve user experience and develop new features</li>
              <li>Send updates and promotional materials (with your consent)</li>
              <li>Ensure security and prevent fraud</li>
            </ul>

            <h2 className="text-2xl font-semibold text-blue-800">4. Data Sharing & Third Parties</h2>
            <p>
              We do not sell your personal data. However, we may share your data with:
            </p>
            <ul className="list-disc ml-6 space-y-2">
              <li>Service providers that help operate our business</li>
              <li>Legal authorities if required by law</li>
            </ul>

            <h2 className="text-2xl font-semibold text-blue-800">5. Security Measures</h2>
            <p>
              We implement industry-standard security measures to protect your
              personal data from unauthorized access or disclosure.
            </p>

            <h2 className="text-2xl font-semibold text-blue-800">6. Your Rights</h2>
            <ul className="list-disc ml-6 space-y-2">
              <li>Access and update your personal data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
            </ul>

            <h2 className="text-2xl font-semibold text-blue-800">7. Cookies Policy</h2>
            <p>
              We use cookies to enhance user experience. You can manage cookie
              settings through your browser preferences.
            </p>

            <h2 className="text-2xl font-semibold text-blue-800">8. Changes to This Policy</h2>
            <p>
              We may update this policy periodically. We encourage you to review it
              regularly.
            </p>

            <h2 className="text-2xl font-semibold text-blue-800">9. Contact Us</h2>
            <p>
              If you have any questions about this policy, contact us at{" "}
              <a href="mailto:will@willbowman.dev" className="text-blue-600 hover:underline">
                will@willbowman.dev
              </a>.
            </p>
          </div>
        </div>

        {/* Back to Home Button (Sticky) */}
        <div className="p-4 border-t border-gray-300 text-center sticky bottom-0 bg-white/80 backdrop-blur-lg rounded-b-3xl">
          <a href="/" className="bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-md transition hover:bg-blue-800">
            Play Now
          </a>
        </div>
      </div>
    </div>
  );
}
