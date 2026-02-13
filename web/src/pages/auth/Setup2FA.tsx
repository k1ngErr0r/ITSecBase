export default function Setup2FA() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Set Up Two-Factor Authentication
        </h2>
        <p className="mb-6 text-sm text-gray-500">
          Scan the QR code with your authenticator app, then enter the code to
          verify.
        </p>
        {/* QR code and verification form will be implemented with Relay queries */}
        <p className="text-sm text-gray-400">
          2FA setup will be available after backend integration.
        </p>
      </div>
    </div>
  )
}
