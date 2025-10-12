import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { clearLocalStorageBan } from '@/lib/contentViolations';

interface BannedUser {
  id: string;
  email: string;
  device_id: string;
  reason: string;
  banned_at: string;
  banned_by: string;
  expires_at: string | null;
}

interface Violation {
  id: string;
  violation_type: string;
  content: string;
  created_at: string;
}

export default function AdminBans() {
  const [bans, setBans] = useState<BannedUser[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showViolationsDialog, setShowViolationsDialog] = useState(false);
  const [banReason, setBanReason] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadBans();
  }, []);

  const loadBans = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-bans', {
        body: { action: 'list' }
      });

      if (error) throw error;
      setBans(data.bans || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load bans',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const unbanUser = async (email: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-bans', {
        body: { action: 'unban', email }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${email} has been unbanned`
      });

      loadBans();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to unban user',
        variant: 'destructive'
      });
    }
  };

  const banUser = async () => {
    if (!selectedEmail || !banReason) {
      toast({
        title: 'Error',
        description: 'Email and reason are required',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase.functions.invoke('manage-bans', {
        body: { 
          action: 'ban', 
          email: selectedEmail,
          reason: banReason
        }
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: `${selectedEmail} has been banned`
      });

      setShowBanDialog(false);
      setSelectedEmail('');
      setBanReason('');
      loadBans();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to ban user',
        variant: 'destructive'
      });
    }
  };

  const viewViolations = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-bans', {
        body: { action: 'violations', email }
      });

      if (error) throw error;

      setViolations(data.violations || []);
      setSelectedEmail(email);
      setShowViolationsDialog(true);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load violations',
        variant: 'destructive'
      });
    }
  };

  const clearMyLocalBan = () => {
    clearLocalStorageBan();
    toast({
      title: 'Success',
      description: 'Your localStorage ban has been cleared. Refresh the page.'
    });
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Ban Management</h1>
          <p className="text-muted-foreground">Manage user bans and content violations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={clearMyLocalBan}>
            Clear My Local Ban
          </Button>
          <Button onClick={() => setShowBanDialog(true)}>Ban User</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Banned Users ({bans.length})</CardTitle>
          <CardDescription>Users currently banned from the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Loading...</p>
          ) : bans.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No banned users</p>
          ) : (
            <div className="space-y-4">
              {bans.map((ban) => (
                <div key={ban.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold">{ban.email}</p>
                    <p className="text-sm text-muted-foreground">Device: {ban.device_id}</p>
                    <p className="text-sm text-muted-foreground">Reason: {ban.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      Banned: {new Date(ban.banned_at).toLocaleDateString()} by {ban.banned_by}
                    </p>
                    {ban.expires_at && (
                      <p className="text-sm text-muted-foreground">
                        Expires: {new Date(ban.expires_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => viewViolations(ban.email)}
                    >
                      View Violations
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => unbanUser(ban.email)}
                    >
                      Unban
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ban User Dialog */}
      <AlertDialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ban User</AlertDialogTitle>
            <AlertDialogDescription>
              Enter the email address and reason for banning this user.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Email address"
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
            />
            <Textarea
              placeholder="Reason for ban"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={banUser}>Ban User</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Violations Dialog */}
      <AlertDialog open={showViolationsDialog} onOpenChange={setShowViolationsDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Violation History for {selectedEmail}</AlertDialogTitle>
            <AlertDialogDescription>
              All content violations recorded for this user
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-3">
            {violations.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">No violations found</p>
            ) : (
              violations.map((violation) => (
                <div key={violation.id} className="p-3 border rounded">
                  <p className="text-sm font-semibold">{violation.violation_type}</p>
                  <p className="text-sm text-muted-foreground mt-1">{violation.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(violation.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogAction>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
