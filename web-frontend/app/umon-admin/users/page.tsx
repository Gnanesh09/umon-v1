"use client";

import { type ReactNode, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi as api, type ApiResult } from "@/lib/adminApi";
import { truncateAddress } from "@/lib/format";
import { Search, Shield, Store, User } from "lucide-react";
import { toast } from "sonner";

type UserRow = {
  id: string;
  wallet_address: string;
  display_name: string | null;
  email: string | null;
  role: string;
  created_at: string;
  updated_at: string;
};

const ROLE_STYLES: Record<string, string> = {
  admin: "bg-indigo-100 text-indigo-700",
  merchant: "bg-emerald-100 text-emerald-700",
  user: "bg-gray-100 text-gray-600",
};

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  admin: Shield,
  merchant: Store,
  user: User,
};

export default function AdminUsersPage(): ReactNode {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  const usersQuery = useQuery({
    queryKey: ["admin-users", search, roleFilter],
    queryFn: async () => {
      const params: Record<string, string> = { limit: "100" };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const res = await api.get<ApiResult<UserRow[]>>("/admin/users", { params });
      return res.data;
    },
  });

  const roleMut = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      await api.put(`/admin/users/${id}/role`, { role });
    },
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: () => toast.error("Failed to update role"),
  });

  const users = usersQuery.data?.data ?? [];
  const total = usersQuery.data?.meta?.total ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <p className="text-sm text-gray-500">{total} total users on the platform</p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by wallet, name, or email..."
            className="h-9 w-72 rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-indigo-500"
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="merchant">Merchant</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium text-gray-500">User</th>
              <th className="px-4 py-3 font-medium text-gray-500">Wallet</th>
              <th className="px-4 py-3 font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 font-medium text-gray-500">Joined</th>
              <th className="px-4 py-3 font-medium text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {usersQuery.isLoading ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No users found</td></tr>
            ) : users.map((u) => {
              const RoleIcon = ROLE_ICONS[u.role] ?? User;
              return (
                <tr key={u.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{u.display_name ?? "—"}</div>
                    {u.email ? <div className="text-xs text-gray-400">{u.email}</div> : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{truncateAddress(u.wallet_address)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_STYLES[u.role] ?? ROLE_STYLES.user}`}>
                      <RoleIcon className="h-3 w-3" />
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      <select
                        value={u.role}
                        onChange={(e) => roleMut.mutate({ id: u.id, role: e.target.value })}
                        className="h-7 rounded border border-gray-200 bg-white px-2 text-xs text-gray-700 outline-none focus:border-indigo-500"
                      >
                        <option value="user">User</option>
                        <option value="merchant">Merchant</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
