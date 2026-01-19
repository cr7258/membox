"use client";

import { useState } from "react";
import {
  UserIcon,
  ChevronDownIcon,
  LogOutIcon,
  UserPlusIcon,
  CheckIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { User } from "@/hooks/use-user";

interface UserSelectorProps {
  currentUser: User | null;
  users: User[];
  onLogin: (username: string) => void;
  onSwitchUser: (userId: string) => void;
  onLogout: () => void;
  isCollapsed?: boolean;
}

export function UserSelector({
  currentUser,
  users,
  onLogin,
  onSwitchUser,
  onLogout,
  isCollapsed = false,
}: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUsername, setNewUsername] = useState("");

  const handleCreateUser = () => {
    if (newUsername.trim()) {
      onLogin(newUsername.trim());
      setNewUsername("");
      setIsCreating(false);
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleCreateUser();
    } else if (e.key === "Escape") {
      setIsCreating(false);
      setNewUsername("");
    }
  };

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
          >
            <UserIcon className="w-5 h-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {currentUser ? currentUser.name : "Select User"}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="relative">
      {/* Current User Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
          "hover:bg-muted/50 text-left",
          isOpen && "bg-muted/50"
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
          <UserIcon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {currentUser ? currentUser.name : "Select User"}
          </p>
          <p className="text-xs text-muted-foreground">
            {currentUser ? "Current user" : "Click to login"}
          </p>
        </div>
        <ChevronDownIcon
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setIsCreating(false);
            }}
          />

          {/* Menu */}
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
            {/* User List */}
            {users.length > 0 && (
              <div className="py-1 max-h-48 overflow-y-auto">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      onSwitchUser(user.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50",
                      currentUser?.id === user.id && "bg-primary/10 text-primary"
                    )}
                  >
                    <UserIcon className="w-4 h-4" />
                    <span className="flex-1 text-left truncate">{user.name}</span>
                    {currentUser?.id === user.id && (
                      <CheckIcon className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Divider */}
            {users.length > 0 && <div className="border-t border-border" />}

            {/* Create New User */}
            {isCreating ? (
              <div className="p-2">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter username..."
                  autoFocus
                  className="w-full px-3 py-2 text-sm bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setIsCreating(false);
                      setNewUsername("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={handleCreateUser}
                    disabled={!newUsername.trim()}
                  >
                    Create
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 text-primary"
              >
                <UserPlusIcon className="w-4 h-4" />
                <span>New User</span>
              </button>
            )}

            {/* Logout */}
            {currentUser && (
              <>
                <div className="border-t border-border" />
                <button
                  onClick={() => {
                    onLogout();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-destructive/10 text-destructive"
                >
                  <LogOutIcon className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Login Modal - for first time users
interface LoginModalProps {
  onLogin: (username: string) => void;
}

export function LoginModal({ onLogin }: LoginModalProps) {
  const [username, setUsername] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onLogin(username.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 p-6 bg-background border border-border rounded-2xl shadow-2xl">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg mb-4">
            <UserIcon className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Welcome to MemBox</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Enter your username to get started
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g., john, alice, bob..."
              autoFocus
              className="w-full px-4 py-3 text-sm bg-muted/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <Button
            type="submit"
            className="w-full py-3"
            disabled={!username.trim()}
          >
            Continue
          </Button>
        </form>

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Your memories will be stored under this username.
          <br />
          Use the same username to access them later.
        </p>
      </div>
    </div>
  );
}
