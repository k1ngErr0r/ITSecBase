import { Suspense, useState } from 'react'
import { graphql, useLazyLoadQuery, useMutation } from 'react-relay'
import { useNavigate } from 'react-router-dom'

const ProfileQuery = graphql`
  query ProfileQuery {
    me {
      id
      email
      displayName
      jobTitle
      department
      profilePictureUrl
      status
      totpEnabled
      lastLoginAt
      createdAt
      groups(first: 20) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  }
`

const UpdateProfileMutation = graphql`
  mutation ProfileUpdateMutation($input: UpdateProfileInput!) {
    updateProfile(input: $input) {
      id
      displayName
      jobTitle
      department
    }
  }
`

const ChangePasswordMutation = graphql`
  mutation ProfileChangePasswordMutation(
    $currentPassword: String!
    $newPassword: String!
  ) {
    changePassword(currentPassword: $currentPassword, newPassword: $newPassword)
  }
`

const SetupTotpMutation = graphql`
  mutation ProfileSetupTotpMutation {
    setupTotp {
      secret
      provisioningUrl
      backupCodes
    }
  }
`

function ProfileContent() {
  const data = useLazyLoadQuery<any>(ProfileQuery, {})
  const [commitUpdateProfile] = useMutation(UpdateProfileMutation)
  const [commitChangePassword] = useMutation(ChangePasswordMutation)
  const [commitSetupTotp] = useMutation(SetupTotpMutation)
  const navigate = useNavigate()

  const user = data.me
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '')
  const [department, setDepartment] = useState(user?.department || '')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [profileMsg, setProfileMsg] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault()
    commitUpdateProfile({
      variables: { input: { displayName, jobTitle, department } },
      onCompleted: () => {
        setProfileMsg('Profile updated.')
        const stored = localStorage.getItem('secbase_user')
        if (stored) {
          const u = JSON.parse(stored)
          u.displayName = displayName
          localStorage.setItem('secbase_user', JSON.stringify(u))
        }
      },
    })
  }

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwMsg('')
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.')
      return
    }
    if (newPassword.length < 8) {
      setPwError('Password must be at least 8 characters.')
      return
    }
    commitChangePassword({
      variables: { currentPassword, newPassword },
      onCompleted: () => {
        setPwMsg('Password changed.')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      },
      onError: (err: Error) => {
        setPwError(err.message || 'Failed to change password.')
      },
    })
  }

  const handleSetupTotp = () => {
    commitSetupTotp({
      variables: {},
      onCompleted: () => {
        navigate('/setup-2fa')
      },
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('secbase_access_token')
    localStorage.removeItem('secbase_refresh_token')
    localStorage.removeItem('secbase_user')
    window.location.href = '/login'
  }

  const formatDate = (d: string | null) => {
    if (!d) return '--'
    return new Date(d).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  if (!user) {
    return (
      <div className="text-center text-sm text-gray-500">
        Not authenticated.
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">My Profile</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Profile form */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Profile Information
            </h3>
            {profileMsg && (
              <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {profileMsg}
              </div>
            )}
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Job Title
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Change password */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Change Password
            </h3>
            {pwError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {pwError}
              </div>
            )}
            {pwMsg && (
              <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">
                {pwMsg}
              </div>
            )}
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* 2FA settings */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Two-Factor Authentication
            </h3>
            {user.totpEnabled ? (
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-700">2FA is enabled</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-500">2FA is not enabled.</p>
                <button
                  onClick={handleSetupTotp}
                  className="mt-4 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  Enable 2FA
                </button>
              </>
            )}
          </div>

          {/* Account info */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Account
            </h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">Groups</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {user.groups.edges.length > 0
                    ? user.groups.edges
                        .map((e: any) => e.node.name)
                        .join(', ')
                    : '--'}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Last Login
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(user.lastLoginAt)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-gray-500">
                  Member Since
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(user.createdAt)}
                </dd>
              </div>
            </dl>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Profile() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        </div>
      }
    >
      <ProfileContent />
    </Suspense>
  )
}
