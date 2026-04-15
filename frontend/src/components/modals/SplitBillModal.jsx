import { useState, useMemo } from "react";
import { X, Users, Divide, Check, Plus, Minus } from "lucide-react";
import { COLORS } from "../../constants";
import { splitOrder } from "../../api/services/orderService";
import { useToast } from "../../hooks/use-toast";

/**
 * SplitBillModal - Split order among multiple people
 * 
 * Two modes:
 * 1. By Person - Select items for each person
 * 2. Equal Split - Divide evenly among N people
 */
const SplitBillModal = ({
  isOpen,
  onClose,
  orderId,
  items = [],  // Cart items with id, name, qty, price
  onSplitSuccess,  // Callback with new order data
}) => {
  const { toast } = useToast();
  
  // Mode: null (selector), 'byPerson', 'equal'
  const [mode, setMode] = useState(null);
  
  // By Person state
  const [persons, setPersons] = useState([
    { id: 1, name: 'Person 1' },
  ]);
  const [activePerson, setActivePerson] = useState(1);
  const [assignments, setAssignments] = useState({}); // { itemId: { personId, qty } }
  
  // Equal Split state
  const [equalSplitCount, setEqualSplitCount] = useState(2);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(false);

  // Calculate totals for each person
  const personTotals = useMemo(() => {
    const totals = {};
    persons.forEach(p => { totals[p.id] = 0; });
    
    Object.entries(assignments).forEach(([itemId, { personId, qty }]) => {
      const item = items.find(i => String(i.id) === String(itemId));
      if (item && personId) {
        const unitPrice = item.unitPrice || item.price / item.qty;
        totals[personId] = (totals[personId] || 0) + (unitPrice * qty);
      }
    });
    
    return totals;
  }, [assignments, items, persons]);

  // Calculate unassigned total
  const totalBill = items.reduce((sum, item) => sum + (item.price || 0), 0);
  const assignedTotal = Object.values(personTotals).reduce((sum, t) => sum + t, 0);
  const unassignedTotal = totalBill - assignedTotal;

  // Get assigned qty for an item
  const getAssignedQty = (itemId) => {
    return assignments[itemId]?.qty || 0;
  };

  // Get remaining qty for an item (not assigned to any person)
  const getRemainingQty = (itemId) => {
    const item = items.find(i => String(i.id) === String(itemId));
    if (!item) return 0;
    return item.qty - getAssignedQty(itemId);
  };

  // Assign item to active person
  const assignItem = (itemId, qty) => {
    const item = items.find(i => String(i.id) === String(itemId));
    if (!item) return;
    
    const maxQty = item.qty;
    const currentAssignment = assignments[itemId];
    
    // If already assigned to same person, update qty
    if (currentAssignment?.personId === activePerson) {
      const newQty = Math.min(qty, maxQty);
      if (newQty <= 0) {
        // Remove assignment
        const newAssignments = { ...assignments };
        delete newAssignments[itemId];
        setAssignments(newAssignments);
      } else {
        setAssignments({
          ...assignments,
          [itemId]: { personId: activePerson, qty: newQty },
        });
      }
    } else {
      // New assignment
      setAssignments({
        ...assignments,
        [itemId]: { personId: activePerson, qty: Math.min(qty, maxQty) },
      });
    }
  };

  // Toggle full item assignment
  const toggleItemAssignment = (itemId) => {
    const item = items.find(i => String(i.id) === String(itemId));
    if (!item) return;
    
    const currentAssignment = assignments[itemId];
    
    if (currentAssignment?.personId === activePerson) {
      // Already assigned to this person - unassign
      const newAssignments = { ...assignments };
      delete newAssignments[itemId];
      setAssignments(newAssignments);
    } else {
      // Assign full qty to this person
      setAssignments({
        ...assignments,
        [itemId]: { personId: activePerson, qty: item.qty },
      });
    }
  };

  // Add new person
  const addPerson = () => {
    const newId = Math.max(...persons.map(p => p.id)) + 1;
    setPersons([...persons, { id: newId, name: `Person ${newId}` }]);
  };

  // Remove person (reassign their items to unassigned)
  const removePerson = (personId) => {
    if (persons.length <= 1) return;
    
    // Remove assignments for this person
    const newAssignments = {};
    Object.entries(assignments).forEach(([itemId, assignment]) => {
      if (assignment.personId !== personId) {
        newAssignments[itemId] = assignment;
      }
    });
    setAssignments(newAssignments);
    
    // Remove person
    setPersons(persons.filter(p => p.id !== personId));
    
    // If active person was removed, switch to first person
    if (activePerson === personId) {
      setActivePerson(persons[0].id);
    }
  };

  // Build splits payload for API
  const buildSplitsPayload = () => {
    if (mode === 'byPerson') {
      // Group items by person
      const personItems = {};
      persons.forEach(p => { personItems[p.id] = []; });
      
      Object.entries(assignments).forEach(([itemId, { personId, qty }]) => {
        const item = items.find(i => String(i.id) === String(itemId));
        if (item && personId) {
          // Always send object format { id, qty } — backend expects this
          personItems[personId].push({ id: Number(item.id), qty });
        }
      });
      
      // Filter out empty splits and return
      return Object.values(personItems).filter(arr => arr.length > 0);
    } else {
      // Equal split - distribute items across N people
      const splits = Array.from({ length: equalSplitCount }, () => []);
      let personIndex = 0;
      
      items.forEach(item => {
        // For simplicity, assign whole items round-robin
        // More sophisticated: split by qty
        for (let i = 0; i < item.qty; i++) {
          splits[personIndex % equalSplitCount].push({ id: Number(item.id), qty: 1 });
          personIndex++;
        }
      });
      
      return splits.filter(arr => arr.length > 0);
    }
  };

  // Handle split confirmation
  const handleSplit = async () => {
    const splits = buildSplitsPayload();
    
    if (splits.length < 1) {
      toast({ title: "Error", description: "Please assign items to at least one person", variant: "destructive" });
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await splitOrder(orderId, splits.length, splits);
      toast({ title: "Success", description: "Bill split successfully!" });
      onSplitSuccess?.(response);
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to split bill";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state when modal opens/closes
  const handleClose = () => {
    setMode(null);
    setPersons([{ id: 1, name: 'Person 1' }]);
    setActivePerson(1);
    setAssignments({});
    setEqualSplitCount(2);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        data-testid="split-bill-modal"
      >
        {/* Header */}
        <div 
          className="px-6 py-4 flex items-center justify-between border-b"
          style={{ borderColor: COLORS.borderGray }}
        >
          <h2 className="text-lg font-semibold" style={{ color: COLORS.darkText }}>
            Split Bill
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            data-testid="split-bill-close"
          >
            <X className="w-5 h-5" style={{ color: COLORS.grayText }} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Mode Selector */}
          {!mode && (
            <div className="space-y-4">
              <p className="text-sm" style={{ color: COLORS.grayText }}>
                How do you want to split the bill?
              </p>
              
              <div className="grid grid-cols-2 gap-4">
                {/* By Person */}
                <button
                  onClick={() => setMode('byPerson')}
                  className="p-6 rounded-xl border-2 hover:border-orange-400 transition-colors text-left"
                  style={{ borderColor: COLORS.borderGray }}
                  data-testid="split-mode-by-person"
                >
                  <Users className="w-8 h-8 mb-3" style={{ color: COLORS.primaryOrange }} />
                  <h3 className="font-semibold mb-1" style={{ color: COLORS.darkText }}>
                    By Person
                  </h3>
                  <p className="text-sm" style={{ color: COLORS.grayText }}>
                    Select items for each person
                  </p>
                </button>
                
                {/* Equal Split */}
                <button
                  onClick={() => setMode('equal')}
                  className="p-6 rounded-xl border-2 hover:border-green-400 transition-colors text-left"
                  style={{ borderColor: COLORS.borderGray }}
                  data-testid="split-mode-equal"
                >
                  <Divide className="w-8 h-8 mb-3" style={{ color: COLORS.primaryGreen }} />
                  <h3 className="font-semibold mb-1" style={{ color: COLORS.darkText }}>
                    Equal Split
                  </h3>
                  <p className="text-sm" style={{ color: COLORS.grayText }}>
                    Divide evenly among N people
                  </p>
                </button>
              </div>
            </div>
          )}
          
          {/* By Person Mode */}
          {mode === 'byPerson' && (
            <div className="space-y-4">
              {/* Person Tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                {persons.map(person => (
                  <button
                    key={person.id}
                    onClick={() => setActivePerson(person.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      activePerson === person.id ? 'text-white' : ''
                    }`}
                    style={{
                      backgroundColor: activePerson === person.id ? COLORS.primaryOrange : COLORS.lightBg,
                      color: activePerson === person.id ? 'white' : COLORS.darkText,
                    }}
                    data-testid={`person-tab-${person.id}`}
                  >
                    {person.name}
                    <span className="ml-2 opacity-75">
                      ₹{Math.round(personTotals[person.id] || 0)}
                    </span>
                  </button>
                ))}
                <button
                  onClick={addPerson}
                  className="px-3 py-2 rounded-full text-sm font-medium transition-colors hover:bg-gray-200"
                  style={{ backgroundColor: COLORS.lightBg, color: COLORS.grayText }}
                  data-testid="add-person-btn"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              {/* Items List */}
              <div className="space-y-2">
                <p className="text-sm font-medium" style={{ color: COLORS.grayText }}>
                  Select items for {persons.find(p => p.id === activePerson)?.name}:
                </p>
                
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {items.map(item => {
                    const assignment = assignments[item.id];
                    const isAssignedToActive = assignment?.personId === activePerson;
                    const isAssignedToOther = assignment && assignment.personId !== activePerson;
                    const unitPrice = item.unitPrice || item.price / item.qty;
                    
                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-lg border transition-colors ${
                          isAssignedToOther ? 'opacity-50' : ''
                        }`}
                        style={{
                          borderColor: isAssignedToActive ? COLORS.primaryOrange : COLORS.borderGray,
                          backgroundColor: isAssignedToActive ? `${COLORS.primaryOrange}10` : 'white',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleItemAssignment(item.id)}
                              className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                                isAssignedToOther ? 'cursor-not-allowed' : ''
                              }`}
                              style={{
                                backgroundColor: isAssignedToActive ? COLORS.primaryOrange : COLORS.borderGray,
                              }}
                              disabled={isAssignedToOther}
                              data-testid={`item-checkbox-${item.id}`}
                            >
                              {isAssignedToActive && <Check className="w-4 h-4 text-white" />}
                            </button>
                            <div>
                              <span className="font-medium" style={{ color: COLORS.darkText }}>
                                {item.name}
                              </span>
                              {isAssignedToOther && (
                                <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-gray-200" style={{ color: COLORS.grayText }}>
                                  {persons.find(p => p.id === assignment.personId)?.name}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {/* Qty selector (if item has qty > 1) */}
                            {item.qty > 1 && isAssignedToActive && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => assignItem(item.id, (assignment?.qty || 0) - 1)}
                                  className="w-6 h-6 rounded-full flex items-center justify-center"
                                  style={{ backgroundColor: COLORS.borderGray }}
                                  data-testid={`item-qty-minus-${item.id}`}
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="w-6 text-center text-sm font-medium">
                                  {assignment?.qty || 0}
                                </span>
                                <button
                                  onClick={() => assignItem(item.id, (assignment?.qty || 0) + 1)}
                                  disabled={(assignment?.qty || 0) >= item.qty}
                                  className="w-6 h-6 rounded-full flex items-center justify-center disabled:opacity-30"
                                  style={{ backgroundColor: COLORS.primaryOrange, color: 'white' }}
                                  data-testid={`item-qty-plus-${item.id}`}
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                            <div className="text-right">
                              <div className="font-medium" style={{ color: COLORS.darkText }}>
                                ₹{Math.round(item.price)}
                              </div>
                              <div className="text-xs" style={{ color: COLORS.grayText }}>
                                x{item.qty} @ ₹{Math.round(unitPrice)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Summary */}
              <div 
                className="p-4 rounded-lg"
                style={{ backgroundColor: COLORS.lightBg }}
              >
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: COLORS.grayText }}>Total Bill:</span>
                  <span className="font-medium" style={{ color: COLORS.darkText }}>₹{Math.round(totalBill)}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: COLORS.grayText }}>Assigned:</span>
                  <span className="font-medium" style={{ color: COLORS.primaryOrange }}>₹{Math.round(assignedTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span style={{ color: COLORS.grayText }}>Remaining (Original Order):</span>
                  <span className="font-medium" style={{ color: COLORS.primaryGreen }}>₹{Math.round(unassignedTotal)}</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Equal Split Mode */}
          {mode === 'equal' && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm mb-2" style={{ color: COLORS.grayText }}>
                  Total Bill
                </p>
                <p className="text-3xl font-bold" style={{ color: COLORS.darkText }}>
                  ₹{Math.round(totalBill)}
                </p>
              </div>
              
              <div>
                <p className="text-sm mb-3 text-center" style={{ color: COLORS.grayText }}>
                  Split among how many people?
                </p>
                <div className="flex items-center justify-center gap-3">
                  {[2, 3, 4, 5, 6].map(n => (
                    <button
                      key={n}
                      onClick={() => setEqualSplitCount(n)}
                      className={`w-12 h-12 rounded-full font-bold text-lg transition-colors ${
                        equalSplitCount === n ? 'text-white' : ''
                      }`}
                      style={{
                        backgroundColor: equalSplitCount === n ? COLORS.primaryGreen : COLORS.lightBg,
                        color: equalSplitCount === n ? 'white' : COLORS.darkText,
                      }}
                      data-testid={`equal-split-${n}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              
              <div 
                className="p-6 rounded-xl text-center"
                style={{ backgroundColor: `${COLORS.primaryGreen}10` }}
              >
                <p className="text-sm mb-1" style={{ color: COLORS.grayText }}>
                  Each person pays
                </p>
                <p className="text-3xl font-bold" style={{ color: COLORS.primaryGreen }}>
                  ₹{Math.round(totalBill / equalSplitCount)}
                </p>
                <p className="text-xs mt-2" style={{ color: COLORS.grayText }}>
                  Items will be distributed automatically
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {mode && (
          <div 
            className="px-6 py-4 border-t flex items-center justify-between"
            style={{ borderColor: COLORS.borderGray }}
          >
            <button
              onClick={() => setMode(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100"
              style={{ color: COLORS.grayText }}
            >
              Back
            </button>
            <button
              onClick={handleSplit}
              disabled={isLoading || (mode === 'byPerson' && Object.keys(assignments).length === 0)}
              className="px-6 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: COLORS.primaryGreen }}
              data-testid="split-confirm-btn"
            >
              {isLoading ? 'Splitting...' : mode === 'byPerson' ? 'Split & Pay' : 'Split Equally'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SplitBillModal;
