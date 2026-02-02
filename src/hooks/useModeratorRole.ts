import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useModeratorRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [canManageRatings, setCanManageRatings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkRoles = async () => {
      if (!user) {
        setIsAdmin(false);
        setIsModerator(false);
        setCanManageRatings(false);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id);

        if (error) {
          console.error("Error checking roles:", error);
          setIsAdmin(false);
          setIsModerator(false);
          setCanManageRatings(false);
        } else {
          const roles = data?.map(r => r.role) || [];
          const hasAdmin = roles.includes("admin");
          const hasModerator = roles.includes("moderator");
          
          setIsAdmin(hasAdmin);
          setIsModerator(hasModerator);
          setCanManageRatings(hasAdmin || hasModerator);
        }
      } catch (err) {
        console.error("Error:", err);
        setIsAdmin(false);
        setIsModerator(false);
        setCanManageRatings(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkRoles();
  }, [user]);

  return { isAdmin, isModerator, canManageRatings, isLoading };
};
