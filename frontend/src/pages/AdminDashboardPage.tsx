import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { motion } from "framer-motion";
import { Building2, Loader2, RefreshCcw, ShieldCheck, Trash2, UserCheck, Users } from "lucide-react";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

type Institution = { id: string; name: string; type: string; ownerId: string; campuses?: unknown[] };
type User = { id: string; name: string; email: string; role: string; isActive: boolean };

const ROLE_OPTIONS = ["SYSTEM_ADMIN", "INSTITUTION_OWNER", "STAFF_ADMIN", "TEACHER"] as const;

const AdminDashboardPage = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteInstId, setDeleteInstId] = useState<string | null>(null);
  const [deletingInst, setDeletingInst] = useState(false);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);
  const [updatingStatusUserId, setUpdatingStatusUserId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const fetchAll = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [r1, r2] = await Promise.all([api.get("/admin/institutions"), api.get("/admin/users")]);
      setInstitutions(r1.data || []);
      setUsers(r2.data || []);
    } catch {
      toast({ title: "Error", description: "Failed to load admin data", variant: "destructive" });
    } finally {
      if (isManualRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const stats = useMemo(() => {
    const totalCampuses = institutions.reduce((total, institution) => total + (institution.campuses?.length || 0), 0);

    return {
      totalInstitutions: institutions.length,
      totalCampuses,
      totalUsers: users.length,
      activeUsers: users.filter((item) => item.isActive).length,
      systemAdmins: users.filter((item) => item.role === "SYSTEM_ADMIN").length,
    };
  }, [institutions, users]);

  const handleDeleteInstitution = async () => {
    if (!deleteInstId) return;
    setDeletingInst(true);
    try {
      await api.delete(`/admin/institutions/${deleteInstId}`);
      toast({ title: "Institution deleted" });
      await fetchAll(true);
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally { setDeletingInst(false); setDeleteInstId(null); }
  };

  const toggleUserActive = async (u: User) => {
    if (u.id === currentUser?.id && u.isActive) {
      toast({ title: "Action blocked", description: "You cannot disable your own account.", variant: "destructive" });
      return;
    }

    setUpdatingStatusUserId(u.id);
    try {
      await api.put(`/admin/users/${u.id}`, { isActive: !u.isActive });
      toast({ title: u.isActive ? "User disabled" : "User enabled" });
      await fetchAll(true);
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setUpdatingStatusUserId(null);
    }
  };

  const updateUserRole = async (targetUser: User, role: string) => {
    if (targetUser.id === currentUser?.id && role !== "SYSTEM_ADMIN") {
      toast({ title: "Action blocked", description: "You cannot change your own role.", variant: "destructive" });
      return;
    }

    setUpdatingRoleUserId(targetUser.id);
    try {
      await api.put(`/admin/users/${targetUser.id}`, { role });
      toast({ title: "Role updated" });
      await fetchAll(true);
    } catch {
      toast({ title: "Role update failed", variant: "destructive" });
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  if (currentUser?.backendRole !== "SYSTEM_ADMIN") {
    return (
      <div className="space-y-6">
        <PageHeader title="System Admin" description="Restricted area" />
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            You do not have permission to access this dashboard.
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) return <SkeletonLoader type="table" count={4} />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <PageHeader
        title="System Admin Dashboard"
        description="Manage institutions, users, roles, and platform-level access"
        badge={`${stats.totalUsers} users`}
        action={
          <Button variant="outline" size="sm" onClick={() => fetchAll(true)} disabled={refreshing} className="gap-2">
            {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground">Institutions</p>
              <p className="text-2xl font-bold">{stats.totalInstitutions}</p>
            </div>
            <Building2 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground">Campuses</p>
              <p className="text-2xl font-bold">{stats.totalCampuses}</p>
            </div>
            <Building2 className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground">All Users</p>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
            </div>
            <Users className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground">Active Users</p>
              <p className="text-2xl font-bold">{stats.activeUsers}</p>
            </div>
            <UserCheck className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-xs text-muted-foreground">System Admins</p>
              <p className="text-2xl font-bold">{stats.systemAdmins}</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </CardContent>
        </Card>
      </section>

      <section>
        <h3 className="mb-2 text-lg font-semibold">Institutions</h3>
        <div className="rounded-lg border border-border bg-card p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Campuses</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {institutions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No institutions found.
                  </TableCell>
                </TableRow>
              ) : (
                institutions.map((institution) => (
                  <TableRow key={institution.id}>
                    <TableCell className="font-medium">{institution.name}</TableCell>
                    <TableCell>{institution.type}</TableCell>
                    <TableCell>{institution.campuses?.length || 0}</TableCell>
                    <TableCell className="font-mono text-xs">{institution.ownerId}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteInstId(institution.id)}
                        className="text-destructive hover:text-destructive"
                        disabled={deletingInst}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-lg font-semibold">Users</h3>
        <div className="rounded-lg border border-border bg-card p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-32">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => {
                  const roleUpdating = updatingRoleUserId === user.id;
                  const statusUpdating = updatingStatusUserId === user.id;

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Select
                          value={user.role}
                          onValueChange={(nextRole) => updateUserRole(user, nextRole)}
                          disabled={roleUpdating || statusUpdating}
                        >
                          <SelectTrigger className="h-8 w-[190px]">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLE_OPTIONS.map((roleOption) => (
                              <SelectItem key={roleOption} value={roleOption}>
                                {roleOption}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "secondary" : "destructive"}>
                          {user.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={user.isActive ? "outline" : "default"}
                          onClick={() => toggleUserActive(user)}
                          disabled={roleUpdating || statusUpdating}
                        >
                          {statusUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : user.isActive ? "Disable" : "Enable"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </section>

      <ConfirmDialog open={!!deleteInstId} onClose={() => setDeleteInstId(null)} onConfirm={handleDeleteInstitution} loading={deletingInst} title="Delete Institution?" description="This will permanently delete the institution and related data." />
    </motion.div>
  );
};

export default AdminDashboardPage;
