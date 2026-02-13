import { Suspense, useState } from 'react'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'
import { useNavigate } from 'react-router-dom'

const Setup2FAQuery = graphql`
  query Setup2FAQuery {
    me {
      id
      totpEnabled
    }
  }
`

const SetupTotpMutation = graphql`
  mutation Setup2FASetupTotpMutation {
    setupTotp {
      secret
      provisioningUrl
      backupCodes
    }
  }
`

const VerifyTotpMutation = graphql`
  mutation Setup2FAVerifyTotpMutation($code: String!) {
    verifyTotp(code: $code) {
      success
    }
  }
`

function Setup2FAContent() {
  const data = useLazyLoadQuery<any>(Setup2FAQuery, {})
  const [commitSetup] = useMutation(SetupTotpMutation)
  const [commitVerify] = useMutation(VerifyTotpMutation)
  const navigate = useNavigate()

  const [step, setStep] = useState<'init' | 'verify' | 'done'>('init')
  const [secret, setSecret] = useState('')
  const [provisioningUrl, setProvisioningUrl] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (data.me?.totpEnabled && step === 'init') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-bold text-gray-900">
            Two-Factor Authentication
          </h2>
          <p className="text-sm text-green-700">
            2FA is already enabled on your account.
          </p>
          <button
            onClick={() => navigate('/admin/profile')}
            className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            Back to Profile
          </button>
        </div>
      </div>
    )
  }

  const handleGenerate = () => {
    setLoading(true)
    commitSetup({
      variables: {},
      onCompleted: (response: any) => {
        const result = response.setupTotp
        setSecret(result.secret)
        setProvisioningUrl(result.provisioningUrl)
        setBackupCodes(result.backupCodes)
        setStep('verify')
        setLoading(false)
      },
      onError: (err: Error) => {
        setError(err.message || 'Failed to generate TOTP secret.')
        setLoading(false)
      },
    })
  }

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    commitVerify({
      variables: { code },
      onCompleted: (response: any) => {
        if (response.verifyTotp.success) {
          setStep('done')
        } else {
          setError('Invalid code. Please try again.')
        }
        setLoading(false)
      },
      onError: (err: Error) => {
        setError(err.message || 'Verification failed.')
        setLoading(false)
      },
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          Set Up Two-Factor Authentication
        </h2>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {step === 'init' && (
          <>
            <p className="mb-6 text-sm text-gray-500">
              Add an extra layer of security to your account by enabling
              two-factor authentication with an authenticator app.
            </p>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Generating...' : 'Generate Secret'}
            </button>
          </>
        )}

        {step === 'verify' && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              Scan the QR code below with your authenticator app (Google
              Authenticator, Authy, etc.), or manually enter the secret key.
            </p>

            {/* QR code placeholder - in production, render using a QR library */}
            <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-2 text-xs font-medium text-gray-500">
                Provisioning URL
              </p>
              <p className="break-all text-xs text-gray-700">
                {provisioningUrl}
              </p>
            </div>

            <div className="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <p className="mb-1 text-xs font-medium text-gray-500">
                Manual entry key
              </p>
              <p className="font-mono text-sm font-bold tracking-wider text-gray-900">
                {secret}
              </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Enter verification code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="000000"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Enable'}
              </button>
            </form>
          </>
        )}

        {step === 'done' && (
          <>
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
              Two-factor authentication has been enabled.
            </div>

            <div className="mb-6">
              <p className="mb-2 text-sm font-medium text-gray-900">
                Backup Codes
              </p>
              <p className="mb-3 text-xs text-gray-500">
                Save these backup codes in a secure location. Each code can only
                be used once.
              </p>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((bc, i) => (
                    <code
                      key={i}
                      className="text-sm font-mono text-gray-800"
                    >
                      {bc}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/admin/profile')}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function Setup2FA() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-100">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
            </div>
          </div>
        </div>
      }
    >
      <Setup2FAContent />
    </Suspense>
  )
}
