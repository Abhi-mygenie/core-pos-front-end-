// CR-069: Reset Password Dialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

export default function ResetPasswordDialog({ open, onOpenChange, employeeName, onConfirm }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleConfirm = () => {
    if (!password || password.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    onConfirm(password);
    setPassword('');
    setConfirmPassword('');
    setError('');
  };

  const handleCancel = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Reset Password</AlertDialogTitle>
          <AlertDialogDescription>
            Set a new password for <span className="font-medium text-slate-700">{employeeName}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label htmlFor="new-password" className="text-xs text-slate-500">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              placeholder="Enter new password"
              data-testid="reset-password-input"
            />
          </div>
          <div>
            <Label htmlFor="confirm-password" className="text-xs text-slate-500">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
              placeholder="Confirm new password"
              data-testid="reset-password-confirm-input"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} data-testid="reset-password-cancel">Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            className="bg-green-600 hover:bg-green-700"
            data-testid="reset-password-confirm"
          >
            Reset Password
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
