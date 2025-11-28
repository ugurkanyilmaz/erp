import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import api from '../../hooks/api';
import { Plus, Trash2, Key, Shield } from 'lucide-react';

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [newUser, setNewUser] = useState({ userName: '', email: '', password: '', fullName: '', role: 'servis' });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await api.get('/api/admin/users');
      setUsers(res.data);
    } catch (err) {
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/admin/users', newUser);

      setSuccess('User created successfully');
      setShowAddModal(false);
      setNewUser({ userName: '', email: '', password: '', fullName: '', role: 'servis' });
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await api.delete(`/api/admin/users/${id}`);

      setSuccess('User deleted successfully');
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/admin/users/${selectedUser.id}/password`, { newPassword });

      setSuccess('Password reset successfully');
      setShowPasswordModal(false);
      setNewPassword('');
      setSelectedUser(null);
    } catch (err) {
      setError('Failed to reset password');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />
      <div className="pt-24 px-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            User Management
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-3 rounded mb-4">{success}</div>}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Username</th>
                <th className="p-4 font-semibold text-gray-600">Full Name</th>
                <th className="p-4 font-semibold text-gray-600">Email</th>
                <th className="p-4 font-semibold text-gray-600">Roles</th>
                <th className="p-4 font-semibold text-gray-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="5" className="p-4 text-center">Loading...</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="p-4 font-medium">{user.userName}</td>
                  <td className="p-4">{user.fullName}</td>
                  <td className="p-4 text-gray-500">{user.email}</td>
                  <td className="p-4">
                    {user.roles && user.roles.map(r => (
                      <span key={r} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mr-1">
                        {r}
                      </span>
                    ))}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => { setSelectedUser(user); setShowPasswordModal(true); }}
                      className="text-gray-500 hover:text-blue-600 p-1"
                      title="Reset Password"
                    >
                      <Key className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="text-gray-500 hover:text-red-600 p-1"
                      title="Delete User"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add New User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded-lg p-2"
                  value={newUser.userName}
                  onChange={e => setNewUser({ ...newUser, userName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  className="w-full border rounded-lg p-2"
                  value={newUser.fullName}
                  onChange={e => setNewUser({ ...newUser, fullName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  className="w-full border rounded-lg p-2"
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  required
                  className="w-full border rounded-lg p-2"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                >
                  <option value="servis">Servis</option>
                  <option value="muhasebe">Muhasebe</option>
                  <option value="admin">Admin</option>
                  <option value="satis">Satış</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Reset Password for {selectedUser?.userName}</h2>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  className="w-full border rounded-lg p-2"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
