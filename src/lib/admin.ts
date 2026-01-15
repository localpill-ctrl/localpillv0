// Admin emails - add your admin emails here
const ADMIN_EMAILS = [
  'admin@localpill.com',
  'localpill@gmail.com',
];

export const isAdmin = (email: string | null | undefined): boolean => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};
