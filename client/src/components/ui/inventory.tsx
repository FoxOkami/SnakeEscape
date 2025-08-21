import React from "react";

interface InventoryItem {
  id: string;
  name: string;
  type: "permanent" | "temporary";
  description?: string;
  icon?: string;
}

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items?: InventoryItem[];
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  items = []
}) => {
  // Handle ESC key to close modal
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Escape' && isOpen) {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown, true); // Use capture phase
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const permanentItems = items.filter(item => item.type === "permanent");
  const temporaryItems = items.filter(item => item.type === "temporary");

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-96 max-w-90vw max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Inventory</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Permanent Items Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Permanent Items</h3>
            {permanentItems.length > 0 ? (
              <div className="space-y-2">
                {permanentItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg bg-green-50 border-green-200 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{item.icon || "📦"}</span>
                      <span className="font-medium text-sm text-gray-800">{item.name}</span>
                      <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">Permanent</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-600 ml-7">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">No permanent items collected yet</p>
                <p className="text-xs mt-1">Complete levels to unlock items!</p>
              </div>
            )}
          </div>

          {/* Temporary Items Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Temporary Items</h3>
            {temporaryItems.length > 0 ? (
              <div className="space-y-2">
                {temporaryItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg bg-orange-50 border-orange-200 hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{item.icon || "⏳"}</span>
                      <span className="font-medium text-sm text-gray-800">{item.name}</span>
                      <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded">Temporary</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-600 ml-7">{item.description}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">No temporary items in inventory</p>
                <p className="text-xs mt-1">Items may be found in levels</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex justify-center items-center text-sm text-gray-600">
            <span>Total Items: {items.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};