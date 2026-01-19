"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "membox_current_user";
const USERS_KEY = "membox_users";

export interface User {
  id: string;
  name: string;
  createdAt: Date;
}

export function useUser() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load users and current user from localStorage
  useEffect(() => {
    console.log("🔄 [useUser] Loading user from localStorage...");
    const savedUsers = localStorage.getItem(USERS_KEY);
    const savedCurrentUserId = localStorage.getItem(STORAGE_KEY);
    console.log("📦 [useUser] savedCurrentUserId:", savedCurrentUserId);
    console.log("📦 [useUser] savedUsers:", savedUsers);

    if (savedUsers) {
      const parsedUsers: User[] = JSON.parse(savedUsers).map((u: User) => ({
        ...u,
        createdAt: new Date(u.createdAt),
      }));
      setUsers(parsedUsers);
      console.log("👥 [useUser] Parsed users:", parsedUsers.map(u => ({ id: u.id, name: u.name })));

      // Restore current user
      if (savedCurrentUserId) {
        const user = parsedUsers.find((u) => u.id === savedCurrentUserId);
        console.log("🔍 [useUser] Found user:", user);
        if (user) {
          setCurrentUser(user);
          // Set cookie for API routes
          const cookieValue = `membox_user_id=${user.id}; path=/; max-age=86400`;
          document.cookie = cookieValue;
          console.log("🍪 [useUser] Set cookie:", cookieValue);
          console.log("🍪 [useUser] Current cookies:", document.cookie);
        } else {
          console.warn("⚠️ [useUser] User not found in list!");
        }
      }
    }

    setIsLoaded(true);
  }, []);

  // Save users to localStorage
  const saveUsers = useCallback((newUsers: User[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(newUsers));
    setUsers(newUsers);
  }, []);

  // Login with username (create if not exists)
  const login = useCallback(
    (username: string) => {
      console.log("🔐 [useUser] Login called with:", username);
      const normalizedName = username.trim();
      if (!normalizedName) return null;

      // Check if user exists
      let user = users.find(
        (u) => u.name.toLowerCase() === normalizedName.toLowerCase()
      );
      console.log("🔍 [useUser] Existing user found:", user);

      if (!user) {
        // Create new user - use normalized username as ID for cross-device memory access
        user = {
          id: normalizedName.toLowerCase().replace(/\s+/g, "_"),
          name: normalizedName,
          createdAt: new Date(),
        };
        console.log("✨ [useUser] Created new user:", user);
        const newUsers = [...users, user];
        saveUsers(newUsers);
      }

      // Set as current user
      localStorage.setItem(STORAGE_KEY, user.id);
      setCurrentUser(user);

      // Set cookie for API routes
      const cookieValue = `membox_user_id=${user.id}; path=/; max-age=86400`;
      document.cookie = cookieValue;
      console.log("🍪 [useUser] Login - Set cookie:", cookieValue);
      console.log("🍪 [useUser] Login - Current cookies:", document.cookie);

      return user;
    },
    [users, saveUsers]
  );

  // Switch to existing user
  const switchUser = useCallback(
    (userId: string) => {
      const user = users.find((u) => u.id === userId);
      if (user) {
        localStorage.setItem(STORAGE_KEY, user.id);
        setCurrentUser(user);
        // Set cookie for API routes
        document.cookie = `membox_user_id=${user.id}; path=/; max-age=86400`;
      }
    },
    [users]
  );

  // Logout (clear current user, keep user list)
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setCurrentUser(null);
    // Clear cookie
    document.cookie = "membox_user_id=; path=/; max-age=0";
  }, []);

  // Delete user
  const deleteUser = useCallback(
    (userId: string) => {
      const newUsers = users.filter((u) => u.id !== userId);
      saveUsers(newUsers);

      // If deleting current user, logout
      if (currentUser?.id === userId) {
        logout();
      }
    },
    [users, currentUser, saveUsers, logout]
  );

  return {
    currentUser,
    users,
    isLoaded,
    login,
    switchUser,
    logout,
    deleteUser,
  };
}
