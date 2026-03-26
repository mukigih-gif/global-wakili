// src/components/auth/Can.tsx
export const Can = ({ perform, children }: { perform: Permission, children: React.ReactNode }) => {
  const { user } = useAuth(); // Your auth hook
  const userPermissions = PERMISSION_MATRIX[user.role] || [];

  if (userPermissions.includes("*") || userPermissions.includes(perform)) {
    return <>{children}</>;
  }
  return null;
};

// Usage:
<Can perform="approve_disbursements">
  <button className="bg-red-600">Release Funds</button>
</Can>