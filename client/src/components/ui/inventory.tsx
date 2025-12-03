import React from "react";

interface InventoryItem {
  id: string;
  name: string;
  description: string;
  image: string;
  duration: 'permanent' | 'temporary';
  modifiers: {
    playerSpeed?: number;
    walkSpeed?: number;
    dashSpeed?: number;
    dashDuration?: number;
    dashCooldown?: number;
    [key: string]: any;
  };
  isActive?: boolean;
  activatedAt?: number;
  expiresAt?: number;
}

interface InventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items?: InventoryItem[];
  onUseItem?: (itemId: string) => void;
  onTogglePermanentItem?: (itemId: string) => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  onClose,
  items = [],
  onUseItem,
  onTogglePermanentItem
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

  const permanentItems = items.filter(item => item.duration === "permanent");

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
          <div className="space-y-4">
            {permanentItems.length > 0 ? (
              <div className="space-y-2">
                {permanentItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 border rounded-lg transition-colors ${
                      item.isActive 
                        ? 'bg-green-100 border-green-300 hover:bg-green-200' 
                        : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{item.image || "📦"}</span>
                        <span className="font-medium text-sm text-gray-800">{item.name}</span>
                      </div>
                      {onTogglePermanentItem && (
                        <button
                          onClick={() => onTogglePermanentItem(item.id)}
                          className={`px-2 py-1 text-white text-xs rounded transition-colors ${
                            item.isActive 
                              ? 'bg-red-600 hover:bg-red-700' 
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          {item.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 ml-7">{item.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <p className="text-sm">No items collected yet</p>
                <p className="text-xs mt-1">Complete levels to unlock items!</p>
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