'use client';

import { searchBillableItems } from '@/lib/billing/manageBillableItems';
import { Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
// The following two are no longer used in handleCreateBill, but kept if other functions use them.
import { getCurrentCashPoint } from '@/lib/billing/patientBilling/cashPointActions';
import { processPayment } from '@/lib/billing/patientBilling/paymentActions';
import { useSession } from '@/lib/context/useSession';
import { getPaymentModes } from '@/lib/reports/paymentModeReport';
// Use the new atomic action
import { createBillWithLineItems, LineItemData } from '@/lib/billing/patientBilling/billActions';


interface NewBillModalProps {
  patientUuid: string;
  patientName: string;
  patientId: string;
  isOpen: boolean;
  onClose: () => void;
  onBillCreated?: () => void;
}

interface BillableItem {
  id: number;
  name: string;
  description: string;
  price: number;
  type: 'ITEM' | 'SERVICE';
  uuid: string;
  department_name?: string;
  service_id?: number;
  item_id?: number;
}

interface LineItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  total: number;
  type: 'ITEM' | 'SERVICE';
  item_id?: number;
  service_id?: number;
  price_id?: number;
}

interface PaymentMode {
  payment_mode_id: number;
  name: string;
  description?: string;
  attributes?: Array<{
    payment_mode_attribute_type_id: number;
    name: string;
    required: boolean;
  }>;
}

export default function NewBillModal({
  patientUuid,
  patientName,
  // patientId,
  isOpen,
  onClose,
  onBillCreated
}: NewBillModalProps) {
  const { sessionLocation } = useSession();
  const [activeStep, setActiveStep] = useState<'items' | 'summary' | 'payment'>('items');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<BillableItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<BillableItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentMode[]>([]);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<number | null>(null);
  const [paymentAttributes, setPaymentAttributes] = useState<Record<string, string>>({});
  const [amountTendered, setAmountTendered] = useState('');
  const [currentBillId, setCurrentBillId] = useState<number | null>(null);
  
  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const tax = 0; // Add tax logic if needed
  const total = subtotal + tax;
console.log(activeStep);
  // Initialize
  useEffect(() => {
    if (isOpen) {
      loadPaymentModes();
    }
  }, [isOpen]);

  const loadPaymentModes = async () => {
    try {
      const rawModes = await getPaymentModes() as any[];
      const normalized = (Array.isArray(rawModes) ? rawModes : []).map((m: any) => {
        const id = Number(m.payment_mode_id ?? m.payment_mode_id ?? m.id ?? m.paymentModeId ?? m.payment_modeId);
        return id && !isNaN(id)
          ? {
              payment_mode_id: id,
              name: String(m.name ?? m.mode_name ?? m.label ?? ''),
              description: m.description ?? m.desc,
              attributes: m.attributes ?? m.payment_mode_attributes ?? []
            }
          : null;
      }).filter(Boolean) as PaymentMode[];

      setPaymentModes(normalized);
    } catch (error) {
      console.error('Failed to load payment modes:', error);
    }
  };

  const loadPaymentModeAttributes = (modeId: number) => {
    const mode = (paymentModes || []).find(m => m.payment_mode_id === modeId);
    if (!mode?.attributes?.length) {
      setPaymentAttributes({});
      return;
    }

    const attrs: Record<string, string> = {};
    mode.attributes.forEach(attr => {
      attrs[attr.payment_mode_attribute_type_id.toString()] = '';
    });
    setPaymentAttributes(attrs);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    setIsLoading(true);
    try {
      const results = await searchBillableItems(searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      alert('Failed to search items');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddItem = () => {
    if (!selectedItem) return;
    
    const lineItem: LineItem = {
      id: selectedItem.id,
      name: selectedItem.name,
      price: selectedItem.price || 0,
      quantity,
      total: (selectedItem.price || 0) * quantity,
      type: selectedItem.type,
      item_id: selectedItem.item_id,
      service_id: selectedItem.service_id,
      // You might need to get price_id differently now
    };

    setLineItems([...lineItems, lineItem]);
    setSelectedItem(null);
    setQuantity(1);
    setSearchTerm('');
    setSearchResults([]);
  };


const handleCreateBill = async () => {
  if (!sessionLocation) {
    alert('No location selected');
    return;
  }

  setIsLoading(true);
  try {
    // Get cash point from session location
    const cashPoint = await getCurrentCashPoint();
    if (!cashPoint) {
      alert('No cash point available');
      return;
    }
    
    // 1. Prepare Line Item Data for the Server Action
    const itemsToInsert: LineItemData[] = lineItems.map((item, index) => ({
      price: item.price,
      priceName: item.name,
      quantity: item.quantity,
      lineItemOrder: index + 1,
      priceId: item.price_id,
      paymentStatus: 'PENDING',
      // Set type-specific fields
      type: item.type,
      itemId: item.type === 'ITEM' ? item.item_id : null, // For items
      serviceId: item.type === 'SERVICE' ? item.service_id : undefined, // For services
      // Conditionally include orderId only if it exists
      // ...(item.order_id && { orderId: item.order_id }),
    }));

    // 2. ***CALL THE ATOMIC SERVER ACTION***
    const result = await createBillWithLineItems(
      patientUuid,
      cashPoint.cash_point_id,
      itemsToInsert
    );
    
    if (!result.success) {
      throw new Error(result.message);
    }

    // Ensure result actually contains a billId before accessing it
    if (!('billId' in result) || typeof (result as any).billId !== 'number') {
      throw new Error('Bill creation did not return a billId');
    }
    
    setCurrentBillId((result as { billId: number }).billId);
    setActiveStep('payment');

  } catch (error: any) {
    alert(`Failed to create bill: ${error.message}`);
  } finally {
    setIsLoading(false);
  }
};

  const handleProcessPayment = async () => {
    if (!currentBillId || !selectedPaymentMode) {
      alert('Please select a payment mode');
      return;
    }

    const amount = parseFloat(amountTendered);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amount < total) {
      alert('Amount tendered is less than total amount');
      return;
    }

    setIsLoading(true);
    try {
      const result = await processPayment({
        billId: currentBillId,
        paymentModeId: selectedPaymentMode,
        amount: total,
        amountTendered: amount,
        attributes: paymentAttributes
      });

      if (result.success) {
        alert('Payment processed successfully!');
        onBillCreated?.();
        onClose();
      } else {
        alert(`Payment failed: ${result.message}`);
      }
    } catch (error: any) {
      alert(`Payment failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveItem = (index: number) => {
  setLineItems(lineItems.filter((_, i) => i !== index));
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">New Bill</h2>
            <p className="text-gray-600">
              For {patientName} (ID: {patientUuid})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Three-column content */}
        <div className="flex-1 grid grid-cols-3 divide-x overflow-hidden">
          
          {/* Left Column: Add Services/Items */}
          <div className="p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Add Services/Items</h3>
            
            {/* Search */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search items..."
                  className="flex-1 border rounded-lg px-3 py-2"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  <Search className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search Results */}
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`} // Changed key to use type and id
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedItem?.id === item.id && selectedItem?.type === item.type 
                        ? 'bg-blue-50 border-blue-300' 
                        : ''
                    }`}
                    onClick={() => setSelectedItem(item)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-gray-600 line-clamp-1">{item.description}</div>
                      </div>
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        {item.type}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="text-sm font-semibold">
                        ${typeof item.price === 'number' ? item.price.toFixed(2) : '0.00'}
                      </div>
                      {item.department_name && (
                        <div className="text-xs text-gray-500">
                          {item.department_name}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : searchTerm ? (
                <div className="text-center py-4 text-gray-500">
                  No items or services found
                </div>
              ) : null}
            </div>

            {/* Selected Item Details */}
            {selectedItem && (
              <div className="border rounded-lg p-4 mb-4 bg-gray-50">
                <h4 className="font-semibold mb-2">Selected Item</h4>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="flex justify-between">
                    <span>Unit Price:</span>
                    <span className="font-semibold">${selectedItem.price}</span>
                    {/* ?.toFixed(2) */}
                  </div>
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-semibold">
                      ${((selectedItem.price || 0) * quantity)}
                    </span>
                  </div>
                  <button
                    onClick={handleAddItem}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add to Bill
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={handleCreateBill}
              disabled={lineItems.length === 0 || isLoading}
              className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Processing...' : 'Create Bill & Proceed to Payment'}
            </button>
          </div>

          {/* Center Column: Bill Summary */}
          <div className="p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Bill Summary</h3>
            
            {lineItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No items added yet
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-6">
                  {lineItems.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-gray-600">
                            Qty: {item.quantity} × ${item.price}
                            {/* .toFixed(2) */}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">${item.total}</span>
                          {/* .toFixed(2) */}
                          <button
                            onClick={() => handleRemoveItem(index)}
                            className="p-1 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${subtotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>${tax}</span>
                    {/* .toFixed(2) */}
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total:</span>
                    <span>${total}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Right Column: Payment */}
          <div className="p-6 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Payment</h3>
            
            {currentBillId ? (
              <>
                <div className="mb-4">
                  <label className="block text-sm text-gray-600 mb-2">Payment Mode</label>
                  <select
                    value={selectedPaymentMode || ''}
                    onChange={(e) => {
                      const modeId = parseInt(e.target.value);
                      setSelectedPaymentMode(modeId);
                      loadPaymentModeAttributes(modeId);
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={isLoading}
                  >
                    <option value="">Select payment mode</option>
                    {paymentModes.map((mode) => (
                      <option key={mode.payment_mode_id} value={mode.payment_mode_id}>
                        {mode.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dynamic Payment Attributes */}
                {selectedPaymentMode && paymentModes.find(m => m.payment_mode_id === selectedPaymentMode)?.attributes?.map((attr) => (
                  <div key={attr.payment_mode_attribute_type_id} className="mb-3">
                    <label className="block text-sm text-gray-600 mb-1">
                      {attr.name} {attr.required && '*'}
                    </label>
                    <input
                      type="text"
                      onChange={(e) => setPaymentAttributes({
                        ...paymentAttributes,
                        [attr.payment_mode_attribute_type_id.toString()]: e.target.value
                      })}
                      className="w-full border rounded-lg px-3 py-2"
                      required={attr.required}
                    />
                  </div>
                ))}

                <div className="mb-6">
                  <label className="block text-sm text-gray-600 mb-2">Amount Tendered</label>
                  <input
                    type="number"
                    step="0.01"
                    min={total}
                    value={amountTendered}
                    onChange={(e) => setAmountTendered(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span className="font-semibold">
                      ${(parseFloat(amountTendered) || 0 - total)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleProcessPayment}
                  disabled={isLoading || !selectedPaymentMode || !amountTendered}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {isLoading ? 'Processing...' : 'Process Payment'}
                </button>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Create bill first to proceed with payment
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}