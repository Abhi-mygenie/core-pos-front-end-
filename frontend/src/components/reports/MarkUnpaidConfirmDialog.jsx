// MarkUnpaidConfirmDialog — CR-003 Phase 3.5 + CR-004 Phase 2 PR-2
//
// Confirmation dialog that fronts a destructive "make-order-unpaid" row
// action. Two consumers today:
//   1. Audit Report's Paid tab — "Mark as Unpaid" pill (default copy).
//   2. Room Orders Report's expanded SRM row — "Remove from Room" pill
//      (overrides title / description / action label / colour).
//
// Both surfaces hit the same backend endpoint (`makeOrderUnpaid`) — the
// only differences are the user-facing copy and the page-level refetch
// strategy. The dialog itself does NOT call any API — it only collects
// user intent and emits `onConfirm(order)` to the page, which owns the
// network call, optimistic state, toasts, and refetch.
//
// Why a confirmation dialog at all?
//   - The action mutates a settled financial record retroactively. The
//     CR explicitly requires a confirmation step (CS-A10 / OQ-C1).
//   - The dialog text reminds the operator of the side-effects (the
//     order will reappear elsewhere as a running order) so it is not
//     invoked accidentally.
//
// Design notes:
//   - Built on the existing AlertDialog primitive. No new modal stack.
//   - Controlled component: parent owns `open`, `order`, and `isPending`.
//   - `isPending` swaps the action label to the pending variant and
//     locks both buttons so the user cannot double-fire while the API
//     call is in flight.
//   - Copy + colour props are optional with backwards-compatible defaults
//     matching the original CR-003 Audit Report usage.

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

/**
 * @param {Object} props
 * @param {boolean} props.open                 Controlled open state.
 * @param {Object|null} props.order            Order being acted on, or null when closed.
 * @param {boolean} props.isPending            True while the API call is in flight.
 * @param {() => void} props.onCancel          Called on Cancel / overlay click / ESC.
 * @param {(order: Object) => void} props.onConfirm   Called when user confirms.
 *
 * Optional copy/styling overrides — defaults match CR-003 Audit Report usage.
 * @param {string} [props.title]               Override the dialog title. May
 *   include `{label}` (a `#orderId` string) which will be substituted at render.
 * @param {React.ReactNode} [props.description]  Override the dialog body.
 * @param {string} [props.actionLabel]         Override the confirm-button label.
 * @param {string} [props.pendingLabel]        Override the in-flight button label.
 * @param {string} [props.actionClassName]     Override the confirm-button colour utility classes.
 * @param {string} [props.testId]              Override the dialog content test id.
 */
const MarkUnpaidConfirmDialog = ({
  open,
  order,
  isPending = false,
  onCancel,
  onConfirm,
  title,
  description,
  actionLabel = 'Mark Unpaid',
  pendingLabel = 'Marking…',
  actionClassName = 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-600',
  testId = 'mark-unpaid-confirm-dialog',
}) => {
  // BUG-071 (Wave 5): user-facing number only. Q5 rule — empty when missing.
  const orderLabel = order?.orderNumber ? `#${order.orderNumber}` : '';

  const renderedTitle = title
    ? title.replace('{label}', orderLabel)
    : `Mark order ${orderLabel} as Unpaid?`;

  const renderedDescription = description ?? (
    <>
      The order will be removed from the Paid tab and will reappear on the
      dashboard as a running order. This action will be reflected on
      other terminals.
    </>
  );

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Block close while pending so the user sees the operation
        // through. The trigger button on the page is also locked, but
        // ESC / overlay click would otherwise sneak past.
        if (!next && isPending) return;
        if (!next) onCancel?.();
      }}
    >
      <AlertDialogContent className="max-w-md" data-testid={testId}>
        <AlertDialogHeader>
          <AlertDialogTitle>{renderedTitle}</AlertDialogTitle>
          <AlertDialogDescription>{renderedDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={isPending}
            data-testid="mark-unpaid-cancel"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending || !order}
            onClick={(e) => {
              // Stop default close-on-action so we can keep the dialog
              // open while the API call is in flight; the page will
              // close it via `open={false}` once the request settles.
              e.preventDefault();
              if (order && !isPending) onConfirm?.(order);
            }}
            data-testid="mark-unpaid-confirm"
            className={actionClassName}
          >
            {isPending ? pendingLabel : actionLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default MarkUnpaidConfirmDialog;
