import React, { useState } from 'react';
import { X, Tag, Check, Edit2 } from 'lucide-react';

interface CategoryManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    existingCategories: string[];
    onRenameCategory: (oldName: string, newName: string) => Promise<void>;
}

const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({ isOpen, onClose, existingCategories, onRenameCategory }) => {
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleEditClick = (cat: string) => {
        setEditingCategory(cat);
        setNewCategoryName(cat);
    };

    const handleSave = async (oldCat: string) => {
        if (!newCategoryName.trim() || newCategoryName.trim() === oldCat) {
            setEditingCategory(null);
            return;
        }
        setLoading(true);
        try {
            await onRenameCategory(oldCat, newCategoryName.trim());
            setEditingCategory(null);
        } catch (error) {
            console.error(error);
            alert('Error al renombrar categoría');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 border border-slate-100">
                <div className="bg-slate-900 px-6 py-5 flex items-center justify-between">
                    <h3 className="text-white font-black text-lg flex items-center">
                        <Tag className="mr-2 text-blue-400" size={20} />
                        Gestionar Categorías
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-2">
                    {existingCategories.length === 0 ? (
                        <p className="text-slate-500 text-center text-sm py-4">No hay categorías registradas.</p>
                    ) : (
                        existingCategories.map((cat, idx) => (
                            <div key={`cat-manage-${idx}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                                {editingCategory === cat ? (
                                    <div className="flex items-center w-full gap-2">
                                        <input
                                            type="text"
                                            value={newCategoryName}
                                            onChange={e => setNewCategoryName(e.target.value)}
                                            className="flex-1 px-3 py-1.5 bg-white border border-blue-300 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            autoFocus
                                            onKeyDown={e => {
                                                if (e.key === 'Enter') handleSave(cat);
                                                if (e.key === 'Escape') setEditingCategory(null);
                                            }}
                                            disabled={loading}
                                        />
                                        <button
                                            onClick={() => handleSave(cat)}
                                            disabled={loading}
                                            className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                            title="Guardar"
                                        >
                                            <Check size={16} />
                                        </button>
                                        <button
                                            onClick={() => setEditingCategory(null)}
                                            disabled={loading}
                                            className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-50"
                                            title="Cancelar"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span className="font-medium text-slate-700">{cat}</span>
                                        <button
                                            onClick={() => handleEditClick(cat)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Renombrar Categoría"
                                            disabled={loading}
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoryManagerModal;
