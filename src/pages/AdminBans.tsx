import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Shield, ArrowLeft } from 'lucide-react';

interface Ban {
  id: string;
  user_id: string | null;
  device_id: string;
  email: string;
  reason: string;
  banned_at: string;
  expires_at: string | null;
  banned_by: string;
}

interface Violation {
  id: string;
  user_id: string | null;
  device_id: string;
  violation_type: string;
  created_at: string;
}

const AdminBans = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bans, setBans] = useState<Ban[]>([]);
  const [violations, setViolations] = useState<Violation[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Unauthorized",
          description: "Please sign in to access this page.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Check if user has admin role
      const { data: hasAdminRole, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });

      if (error) {
        console.error('Error checking admin status:', error);
        toast({
          title: "Error",
          description: "Failed to verify admin status.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      if (!hasAdminRole) {
        toast({
          title: "Forbidden",
          description: "You don't have permission to access this page.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      loadBansAndViolations();
    } catch (error) {
      console.error('Error in checkAdminStatus:', error);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const loadBansAndViolations = async () => {
    try {
      // Load bans
      const { data: bansData, error: bansError } = await supabase
        .from('banned_users')
        .select('*')
        .order('banned_at', { ascending: false });

      if (bansError) {
        console.error('Error loading bans:', bansError);
      } else {
        setBans(bansData || []);
      }

      // Load violations
      const { data: violationsData, error: violationsError } = await supabase
        .from('content_violations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (violationsError) {
        console.error('Error loading violations:', violationsError);
      } else {
        setViolations(violationsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <Shield className="h-8 w-8 text-red-400" />
          <h1 className="text-3xl font-bold text-white">Admin - Ban Management</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Active Bans */}
          <Card className="bg-black/20 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Active Bans</CardTitle>
              <CardDescription className="text-purple-200">
                Currently banned users and devices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {bans.filter(ban => !ban.expires_at || new Date(ban.expires_at) > new Date()).map(ban => (
                  <div key={ban.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="space-y-2">
                      <p className="text-white font-semibold">{ban.email || 'Unknown'}</p>
                      <p className="text-purple-200 text-sm">Device: {ban.device_id}</p>
                      <p className="text-purple-200 text-sm">Reason: {ban.reason}</p>
                      <p className="text-purple-200 text-sm">
                        Banned: {new Date(ban.banned_at).toLocaleDateString()}
                      </p>
                      <p className="text-purple-200 text-sm">By: {ban.banned_by}</p>
                    </div>
                  </div>
                ))}
                {bans.filter(ban => !ban.expires_at || new Date(ban.expires_at) > new Date()).length === 0 && (
                  <p className="text-purple-200 text-center py-4">No active bans</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Violations */}
          <Card className="bg-black/20 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="text-white">Recent Violations</CardTitle>
              <CardDescription className="text-purple-200">
                Latest content policy violations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {violations.map(violation => (
                  <div key={violation.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <div className="space-y-2">
                      <p className="text-white font-semibold">{violation.violation_type}</p>
                      <p className="text-purple-200 text-sm">Device: {violation.device_id}</p>
                      <p className="text-purple-200 text-sm">
                        Date: {new Date(violation.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {violations.length === 0 && (
                  <p className="text-purple-200 text-center py-4">No violations recorded</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminBans;