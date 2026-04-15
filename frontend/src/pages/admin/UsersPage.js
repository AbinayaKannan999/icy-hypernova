import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getUsers({ role: roleFilter, search: searchQuery, limit: 50 });
      setUsers(res.data.data.users);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  const toggleStatus = async (id, currentStatus) => {
    try {
      await adminAPI.toggleUserStatus(id);
      toast.success(`User ${currentStatus ? 'deactivated' : 'activated'}`);
      setUsers(prev => prev.map(u => u.id === id ? { ...u, is_active: !currentStatus } : u));
    } catch (err) {
      toast.error('Failed to toggle user status');
    }
  };

  const changeRole = async (id, role) => {
    try {
      await adminAPI.changeUserRole(id, { role });
      toast.success('User role updated');
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage platform users, roles, and access</p>
        </div>
      </div>

      <div className="card">
        <div className="card-header border-b pb-4">
          <form className="flex gap-3 w-full" onSubmit={handleSearch}>
            <input 
              type="text" 
              className="form-control flex-1" 
              placeholder="Search by name or email..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <select 
              className="form-control" 
              style={{ width: 200 }}
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="admin">Admins</option>
              <option value="donor">Donors</option>
              <option value="volunteer">Volunteers</option>
              <option value="receiver">Receivers</option>
            </select>
            <button className="btn btn-primary" type="submit">Search</button>
          </form>
        </div>

        {loading ? (
          <div className="p-8 text-center"><div className="spinner"></div></div>
        ) : (
          <div className="table-container border-0 rounded-none">
            <table className="table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className={!u.is_active ? 'opacity-50' : ''}>
                    <td>
                      <div className="font-semibold text-gray-900">{u.name}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </td>
                    <td>
                      <select 
                        className="form-control form-sm p-1 text-sm bg-transparent border-transparent cursor-pointer" 
                        value={u.role}
                        onChange={(e) => changeRole(u.id, e.target.value)}
                        style={{ width: 'auto', fontWeight: 600, color: 'var(--primary-700)' }}
                      >
                        <option value="admin">Admin</option>
                        <option value="donor">Donor</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="receiver">Receiver</option>
                      </select>
                    </td>
                    <td>
                      <div className="text-sm">{u.city || '—'}</div>
                      <div className="text-xs text-gray-500">{u.state || ''}</div>
                    </td>
                    <td>
                      <button 
                        className={`badge ${u.is_active ? 'badge-success' : 'badge-error'} cursor-pointer border-0`}
                        onClick={() => toggleStatus(u.id, u.is_active)}
                        title="Click to toggle status"
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="text-xs text-gray-500">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <button 
                        className="btn btn-ghost btn-sm text-error"
                        onClick={() => toggleStatus(u.id, u.is_active)}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-gray-500">No users found matching your criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UsersPage;
