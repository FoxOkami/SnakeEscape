import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Badge } from "./badge";
import { Button } from "./button";
import { X } from "lucide-react";

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
  const permanentItems = items.filter(item => item.type === "permanent");
  const temporaryItems = items.filter(item => item.type === "temporary");

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-2xl font-bold">Inventory</DialogTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Permanent Items Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-green-600">
              Permanent Items
            </h3>
            {permanentItems.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {permanentItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg bg-green-50 border-green-200 hover:bg-green-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{item.icon || "📦"}</span>
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-600">{item.description}</p>
                    )}
                    <Badge variant="secondary" className="mt-2 text-xs">
                      Permanent
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No permanent items collected yet</p>
                <p className="text-sm mt-1">Complete levels to unlock items!</p>
              </div>
            )}
          </div>

          {/* Temporary Items Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-orange-600">
              Temporary Items
            </h3>
            {temporaryItems.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {temporaryItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border rounded-lg bg-orange-50 border-orange-200 hover:bg-orange-100 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{item.icon || "⏳"}</span>
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    {item.description && (
                      <p className="text-xs text-gray-600">{item.description}</p>
                    )}
                    <Badge variant="outline" className="mt-2 text-xs">
                      Temporary
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No temporary items in inventory</p>
                <p className="text-sm mt-1">Items may be found in levels</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t">
          <div className="flex justify-between items-center text-sm text-gray-600">
            <span>Total Items: {items.length}</span>
            <span>Press ESC to close</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};