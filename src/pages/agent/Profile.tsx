import React, { useEffect, useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Mail, Phone, MapPin, Calendar, Shield, Building } from 'lucide-react';
import { api } from '@/lib/api';

interface AgentProfile {
  agent_ID: number;
  agent_name: string;
  agent_email: string;
  agent_phone: string;
  agent_address: string;
  agent_city: string;
  agent_state: string;
  agent_country: string;
  agent_pincode: string;
  agent_company_name: string;
  agent_validity_date: string;
  agent_status: number;
}

const Profile = () => {
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api('/agents/profile');
        setProfile(data);
      } catch (error) {
 console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="p-8 text-center text-red-500">Failed to load profile.</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-3xl font-bold bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
          My Profile
        </h3>
        <Button variant="outline">Edit Profile</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 {/* Left Column: Avatar & Basic Info */}
        <Card className="p-6 text-center space-y-4">
          <div className="w-24 h-24 bg-primary/10 rounded-full mx-auto flex items-center justify-center">
            <User className="h-12 w-12 text-primary" />
          </div>
          <div>
            <h4 className="text-xl font-bold">{profile.agent_name}</h4>
            <p className="text-sm text-muted-foreground">{profile.agent_company_name}</p>
          </div>
          <div className="pt-4 border-t border-border">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-4 w-4" />
              <span>Status: {profile.agent_status === 1 ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </Card>

 {/* Right Column: Detailed Info */}
        <Card className="md:col-span-2 p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Mail className="h-4 w-4" />
                Email Address
              </div>
              <p className="text-foreground">{profile.agent_email}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Phone className="h-4 w-4" />
                Phone Number
              </div>
              <p className="text-foreground">{profile.agent_phone}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Building className="h-4 w-4" />
                Company Name
              </div>
              <p className="text-foreground">{profile.agent_company_name}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Validity Date
              </div>
              <p className="text-foreground">
                {profile.agent_validity_date ? new Date(profile.agent_validity_date).toLocaleDateString() : 'N/A'}
              </p>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Address
              </div>
              <p className="text-foreground">
                {profile.agent_address}, {profile.agent_city}, {profile.agent_state}, {profile.agent_country} - {profile.agent_pincode}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
