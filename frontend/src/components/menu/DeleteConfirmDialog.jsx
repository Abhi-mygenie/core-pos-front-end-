import { AlertTriangle } from 'lucide-react';
import { COLORS } from '../../constants';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';

const DeleteConfirmDialog = ({ 
  open, 
  onOpenChange, 
  title = 'Delete Item',
  description = 'Are you sure you want to delete this item? This action cannot be undone.',
  itemName = '',
  isLoading = false,
  onConfirm 
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="delete-confirm-dialog">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#FEE2E2' }}
            >
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {itemName && (
          <div 
            className="p-3 rounded-lg my-4"
            style={{ backgroundColor: COLORS.sectionBg }}
          >
            <p className="text-sm" style={{ color: COLORS.grayText }}>Item to delete:</p>
            <p className="font-semibold" style={{ color: COLORS.darkText }}>{itemName}</p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-red-500 hover:bg-red-600 text-white"
            data-testid="confirm-delete"
          >
            {isLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteConfirmDialog;
