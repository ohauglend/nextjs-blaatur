import { PackingList as PackingListType, PackingItem } from '@/data/packing-lists';

interface PackingListProps {
  packingList: PackingListType;
}

function PackingItemComponent({ item }: { item: PackingItem }) {
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'clothing': return '👕';
      case 'electronics': return '🔌';
      case 'personal': return '🧴';
      case 'documents': return '📄';
      case 'special': return '🎯';
      default: return '📦';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'clothing': return 'bg-blue-50 border-blue-200';
      case 'electronics': return 'bg-purple-50 border-purple-200';
      case 'personal': return 'bg-green-50 border-green-200';
      case 'documents': return 'bg-red-50 border-red-200';
      case 'special': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`p-3 rounded-lg border-2 ${getCategoryColor(item.category)} ${
      item.required ? 'border-solid' : 'border-dashed opacity-75'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-lg">{getCategoryIcon(item.category)}</span>
          <div>
            <span className={`font-medium ${item.required ? 'text-gray-800' : 'text-gray-600'}`}>
              {item.item}
            </span>
            {item.required && <span className="text-red-500 ml-1">*</span>}
          </div>
        </div>
        <span className="text-xs uppercase tracking-wide text-gray-500 bg-white px-2 py-1 rounded">
          {item.category}
        </span>
      </div>
      {item.notes && (
        <p className="text-sm text-gray-600 mt-2 italic">
          💡 {item.notes}
        </p>
      )}
    </div>
  );
}

export default function PackingList({ packingList }: PackingListProps) {
  const requiredItems = packingList.items.filter(item => item.required);
  const optionalItems = packingList.items.filter(item => !item.required);

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          📋 Your Personal Packing List
        </h2>
        <p className="text-gray-600">
          Everything you need for the mystery adventure!
        </p>
      </div>

      {packingList.specialInstructions && packingList.specialInstructions.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
            <span className="mr-2">📝</span>
            Special Instructions
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            {packingList.specialInstructions.map((instruction, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                {instruction}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
            <span className="mr-2">⚠️</span>
            Essential Items ({requiredItems.length})
          </h3>
          <div className="space-y-3">
            {requiredItems.map((item, index) => (
              <PackingItemComponent key={index} item={item} />
            ))}
          </div>
        </div>

        {optionalItems.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
              <span className="mr-2">💭</span>
              Optional Items ({optionalItems.length})
            </h3>
            <div className="space-y-3">
              {optionalItems.map((item, index) => (
                <PackingItemComponent key={index} item={item} />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600 text-center">
          <span className="font-medium">*</span> Required items • 
          <span className="font-medium"> Dashed border</span> = Optional items
        </p>
      </div>
    </div>
  );
}
