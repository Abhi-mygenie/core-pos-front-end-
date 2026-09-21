// CR-385 M0 — Front Desk snapshot service. Money: charge.* only (D50). Dates: meta.business_date only (X-06).
// LR window is ALWAYS sent (C2: 422 without start_date/end_date). Board/KPI failures degrade, LR failure throws (F14, OD-385-11).
import api from '../axios';
import { AIOSELL_ENDPOINTS } from '../constants';
import { fromRoomStatusBoard } from '../transforms/roomStatusTransform';
import { fromFrontDeskSnapshot } from '../transforms/frontDeskTransform';
import { patchRoomStatus as pmsPatchRoomStatus, bulkMarkClean as pmsBulkMarkClean, cancelReservation as pmsCancelReservation, markNoShowBooking as pmsMarkNoShowBooking } from './pmsService'; // CR-385 M2

export const getLocalReservationsAll = ({ start, end }) =>
  api.get(AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS, { params: { start_date: start, end_date: end, view: 'all' } }).then((r) => r.data);

export const getBoard = () =>
  api.get(AIOSELL_ENDPOINTS.ROOM_STATUS_BOARD).then((r) => fromRoomStatusBoard(r.data));

export const getKpis = ({ start, end }) =>
  api.get(AIOSELL_ENDPOINTS.DASHBOARD_KPIS, { params: { start_date: start, end_date: end } }).then((r) => r.data);

// KPIs: server caps the range at 31 days (422 'Date range cannot exceed 31 days.' — found by QA iteration_5); only today.* is read, so the KPI window is a single day.
export const getSnapshot = async ({ start, end, today }) => {
  const kpiDay = today ?? start;
  const [lr, board, kpis] = await Promise.allSettled([
    getLocalReservationsAll({ start, end }),
    getBoard(),
    getKpis({ start: kpiDay, end: kpiDay }),
  ]);
  if (lr.status === 'rejected') throw lr.reason;
  return fromFrontDeskSnapshot({ lr: lr.value, board, kpis });
};

// Re-exports — pmsService is called, never edited (plan §1.3)
export const patchRoomStatus = (tableId, status) => pmsPatchRoomStatus(tableId, status);
export const bulkMarkClean = (tableIds) => pmsBulkMarkClean(tableIds);

// CR-385 M2 — Cancel / No-Show reuse the existing pmsService calls; Modify PATCHes the LR row directly.
// Body is the INTENT only ({checkin, checkout, rateplan_code, reason} + preview:true for a dry run) — never amount_after_tax (G-02, BQ-385-08).
export const cancelReservation = (reservationId, opts) => pmsCancelReservation(reservationId, opts);
export const markNoShow = (bookingId, channel) => pmsMarkNoShowBooking(bookingId, channel);
export const modifyReservation = (reservationId, body) =>
  api.patch(`${AIOSELL_ENDPOINTS.LOCAL_RESERVATIONS}/${reservationId}`, body).then((r) => r.data);
export const previewModifyReservation = (reservationId, body) => modifyReservation(reservationId, { ...body, preview: true });
