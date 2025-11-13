"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";



type User = {
  id?: string; // Made id optional for new users
  email: string;
  password?: string;
  name: string;
  last_name: string;
  role: "admin" | "user" | "dev";
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  phone?: string;
  screens?: string[];
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [newUser, setNewUser] = useState<User>({
    id: undefined, // Optional for new users
    name: "",
    last_name: "",
    email: "",
    password: "", // Initialize password
    role: "user",
    phone: "",
    screens: [], // Initialize screens as empty array
  });
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    // Generate predictive email
    if (newUser.name && newUser.last_name) {
      const firstLetter = newUser.name.charAt(0).toLowerCase();
      const lastName = newUser.last_name.split(" ")[0].toLowerCase();
      const email = `${firstLetter}${lastName}@fasercon.cl`;
      setNewUser((prev) => ({ ...prev, email }));

      // Generate predictive password
      const randomText = Math.random().toString(36).slice(-6);
      const password = `${lastName.charAt(0).toUpperCase()}${lastName.slice(1)}_${randomText}`;
      setNewUser((prev) => ({ ...prev, password }));
    }
  }, [newUser.name, newUser.last_name]);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
  const { data, error } = await supabase.from("fasercon_users").select("id, email, password, name, role, is_active, created_at, updated_at, last_login, last_name, phone, screens");
    if (error) {
      setError(error.message);
    } else if (data) {
      setUsers(data as User[]);
    }
    setLoading(false);
  }

  async function handleCreateUser() {
    try {
      // Exclude id from the data sent to API
      const { /* id, */ ...userData } = newUser;
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      const result = await response.json();
      if (response.ok) {
        alert('Usuario creado exitosamente');
        setNewUser({ name: '', last_name: '', email: '', password: '', role: 'user', phone: '', screens: [] });
      } else {
        console.error('Error al crear usuario:', result.error);
        alert('Error al crear usuario');
      }
    } catch (error) {
      console.error('Error al crear usuario:', error);
      alert('Error al crear usuario');
    }
  }

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedRole = e.target.value as "admin" | "user";
    setNewUser({ ...newUser, role: selectedRole });
  };

  function capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  }


  const { data: session } = useSession();

  async function handleDeleteUser(userId: string) {
    if (!userId) return;
    if (session?.user?.role !== "dev") return;
    const { error } = await supabase.from("fasercon_users").delete().eq("id", userId);
    if (error) {
      alert("Error al eliminar usuario: " + error.message);
    } else {
      setUsers(users.filter(u => u.id !== userId));
      alert("Usuario eliminado exitosamente");
    }
  }

  return (
    <div className="w-full overflow-x-hidden">
      <h1 className="text-2xl font-bold mb-4">Gestión de Usuarios</h1>
      {error && <div className="text-red-500">Error: {error}</div>}

      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">Crear Nuevo Usuario</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Nombres"
            value={newUser.name}
            onChange={(e) => setNewUser({ ...newUser, name: capitalizeWords(e.target.value) })}
            className="border p-2 rounded mb-2 w-full h-12"
          />
          <input
            type="text"
            placeholder="Apellidos"
            value={newUser.last_name}
            onChange={(e) => setNewUser({ ...newUser, last_name: capitalizeWords(e.target.value) })}
            className="border p-2 rounded mb-2 w-full h-12"
          />
          <input
            type="email"
            placeholder="Correo Electrónico"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            className="border p-2 rounded mb-2 w-full h-12"
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="border p-2 rounded mb-2 w-full h-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 focus:outline-none -translate-y-1"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <select
            value={newUser.role}
            onChange={handleRoleChange}
            className="border p-2 rounded mb-2 w-full h-12"
          >
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>
          <PhoneInput
            international
            defaultCountry="CL"
            value={newUser.phone || undefined}
            onChange={(val) => setNewUser({ ...newUser, phone: val || '' })}
            className="w-full border border-gray-700 px-3 py-1 rounded-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 mb-2"
            placeholder="+56 9 1234 5678"
          />
          
          {newUser.role === "user" && (
            <div className="mb-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Pantallas permitidas</label>
              <div className="space-y-2">
                {["dashboard", "products", "services", "quotes", "contact"].map((screen) => (
                  <label key={screen} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newUser.screens?.includes(screen) || false}
                      onChange={(e) => {
                        const screens = newUser.screens || [];
                        if (e.target.checked) {
                          setNewUser({ ...newUser, screens: [...screens, screen] });
                        } else {
                          setNewUser({ ...newUser, screens: screens.filter((s) => s !== screen) });
                        }
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{screen}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleCreateUser}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Crear Usuario
        </button>
      </div>

      <h2 className="text-lg font-semibold mb-2">Usuarios Existentes</h2>
      {loading ? (
        <p>Cargando usuarios...</p>
      ) : (
        <div>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden" style={{overflowX: 'hidden'}}>
            {users.map((user) => (
              <div key={user.id} className="bg-white border rounded p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{user.name} {user.last_name}</div>
                    <div className="text-xs font-mono text-gray-500 truncate">{user.id ? user.id.split('-')[0] : ''}</div>
                    <div className="text-sm text-gray-700 truncate">{user.email}</div>
                    <div className="text-sm text-gray-700">{user.role}</div>
                    {user.phone && <div className="text-sm text-gray-700 truncate">{user.phone}</div>}
                    {Array.isArray(user.screens) && user.screens.length > 0 && <div className="text-sm text-gray-600 truncate">{user.screens.join(', ')}</div>}
                    <div className="text-sm text-gray-600 mt-1">{user.last_login ? new Date(user.last_login).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-end gap-2">
                    {session?.user?.role === 'dev' && user.role !== 'dev' && (
                      <>
                        <button onClick={() => { setEditUser(user); setShowEditModal(true); }} className="px-2 py-1 bg-blue-500 text-white rounded text-sm"><Pencil size={20} /></button>
                        <button onClick={() => handleDeleteUser(user.id!)} className="px-2 py-1 bg-red-600 text-white rounded text-sm"><Trash2 size={20} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block w-full">
            <div className="overflow-x-hidden">
              <table className="w-full border-collapse border border-gray-300 table-fixed">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-2 text-center whitespace-nowrap">ID</th>
                    <th className="border border-gray-300 p-2 whitespace-nowrap">Correo</th>
                    <th className="border border-gray-300 p-2 whitespace-nowrap">Nombre</th>
                    <th className="border border-gray-300 p-2 whitespace-nowrap">Apellido</th>
                    <th className="border border-gray-300 p-2 whitespace-nowrap">Rol</th>
                    <th className="border border-gray-300 p-2 whitespace-nowrap hidden lg:table-cell">Teléfono</th>
                    <th className="border border-gray-300 p-2 whitespace-nowrap hidden xl:table-cell">Pantallas</th>
                    <th className="border border-gray-300 p-2 whitespace-nowrap">Creado</th>
                    <th className="border border-gray-300 p-2 whitespace-nowrap">Último login</th>
                    {session?.user?.role === "dev" && (
                      <th className="border border-gray-300 p-2 whitespace-nowrap">Acciones</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="border border-gray-300 p-2 text-center max-w-[60px] truncate">
                        <span title={user.id} style={{ cursor: 'pointer', borderBottom: '1px dotted #888' }}>
                          {user.id ? user.id.split('-')[0] : ''}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-2 max-w-[160px] truncate break-words">{user.email}</td>
                      <td className="border border-gray-300 p-2 max-w-[120px] truncate break-words">{user.name}</td>
                      <td className="border border-gray-300 p-2 max-w-[120px] truncate break-words">{user.last_name || ''}</td>
                      <td className="border border-gray-300 p-2 text-center max-w-[80px] truncate">{user.role}</td>
                      <td className="border border-gray-300 p-2 text-center max-w-[120px] truncate break-words hidden lg:table-cell">{user.phone}</td>
                      <td className="border border-gray-300 p-2 text-center max-w-[180px] truncate break-words hidden xl:table-cell">{Array.isArray(user.screens) ? user.screens.join(", ") : ""}</td>
                      <td className="border border-gray-300 p-2 text-center max-w-[120px] truncate">{user.created_at ? new Date(user.created_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</td>
                      <td className="border border-gray-300 p-2 text-center max-w-[160px] truncate">{user.last_login ? new Date(user.last_login).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : ''}</td>
                      {session?.user?.role === "dev" && user.role !== "dev" && (
                        <td className="border border-gray-300 p-2 text-center">
                          <div className="flex items-center gap-2 justify-center flex-wrap">
                            <button onClick={() => { setEditUser(user); setShowEditModal(true); }} className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs" title="Editar usuario"><Pencil size={16} /></button>
                            <button onClick={() => handleDeleteUser(user.id!)} className="p-2 bg-red-600 text-white rounded hover:bg-red-700 text-xs" title="Eliminar usuario"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    {showEditModal && editUser && (
      <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
          <button
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            onClick={() => setShowEditModal(false)}
          >
            &times;
          </button>
          <h2 className="text-xl font-bold mb-4">Editar Usuario</h2>
          <form
            onSubmit={e => {
              e.preventDefault();
              // Aquí iría la lógica para actualizar el usuario en Supabase
              setShowEditModal(false);
            }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Editable fields only */}
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={editUser.name}
                onChange={e => setEditUser({ ...editUser, name: e.target.value })}
                placeholder="Nombres"
              />
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={editUser.last_name}
                onChange={e => setEditUser({ ...editUser, last_name: e.target.value })}
                placeholder="Apellidos"
              />
              <input
                type="email"
                className="border p-2 rounded w-full"
                value={editUser.email}
                onChange={e => setEditUser({ ...editUser, email: e.target.value })}
                placeholder="Correo Electrónico"
              />
              {/* Phone with country selector */}
              <PhoneInput
                international
                defaultCountry="CL"
                value={editUser.phone || undefined}
                onChange={val => setEditUser({ ...editUser, phone: val || '' })}
                className="w-full border border-gray-700 px-3 py-1 rounded-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-100 mb-2"
                placeholder="+56 9 1234 5678"
              />
            </div>
            {/* Screens selector for user role */}
            {editUser.role === "user" && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Pantallas permitidas</label>
                <div className="space-y-2">
                  {["dashboard", "products", "services", "quotes", "contact"].map((screen) => (
                    <label key={screen} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={editUser.screens?.includes(screen) || false}
                        onChange={e => {
                          const screens = editUser.screens || [];
                          if (e.target.checked) {
                            setEditUser({ ...editUser, screens: [...screens, screen] });
                          } else {
                            setEditUser({ ...editUser, screens: screens.filter((s) => s !== screen) });
                          }
                        }}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 capitalize">{screen}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button type="button" className="px-4 py-2 bg-gray-300 rounded" onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Guardar</button>
            </div>
          </form>
        </div>
      </div>
    )}
    <style jsx>{`
      table {
        width: 100%;
      }
      th, td {
        word-break: break-word;
        overflow-wrap: anywhere;
        padding: 0.5rem;
      }
      .no-scroll-x {
        overflow-x: hidden !important;
      }
    `}</style>
    </div>
  );
}