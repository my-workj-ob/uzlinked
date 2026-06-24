import React from 'react';
import { createClient } from '@/utils/supabase/client';

interface ReelActionsProps {
  reelId: string;
  userId: string;
  title: string;
  description: string;
  onUpdate: (updatedReel: { title: string; description: string }) => void;
  onDelete: () => void;
}

export function ReelActions({ reelId, userId, title, description, onUpdate, onDelete }: ReelActionsProps) {
  const supabase = createClient();
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedTitle, setEditedTitle] = React.useState(title);
  const [editedDescription, setEditedDescription] = React.useState(description);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);

  const handleUpdate = async () => {
    try {
      const { error } = await supabase
        .from('reels')
        .update({ title: editedTitle, description: editedDescription })
        .eq('id', reelId)
        .eq('user_id', userId);

      if (error) throw error;

      onUpdate({ title: editedTitle, description: editedDescription });
      setIsEditing(false);
      alert('Reel muvaffaqiyatli yangilandi');
    } catch (error) {
      alert('Reel yangilanishida xatolik yuz berdi');
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('reels')
        .delete()
        .eq('id', reelId)
        .eq('user_id', userId);

      if (error) throw error;

      onDelete();
      alert('Reel muvaffaqiyatli o\'chirildi');
    } catch (error) {
      alert('Reel o\'chirishda xatolik yuz berdi');
    }
  };

  return (
    <div className="flex gap-2">
      {/* Edit Button */}
      <button
        onClick={() => setIsEditing(true)}
        className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
      >
        Tahrirlash
      </button>

      {/* Delete Button */}
      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
      >
        O'chirish
      </button>

      {/* Edit Modal */}
{isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Reelni tahrirlash</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Sarlavha
                </label>
                <input
                  id="title"
                  value={editedTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Tavsif
                </label>
                <textarea
                  id="description"
                  value={editedDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Saqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Link */}
      <a
        href={`/dashboard/reels/edit/${reelId}`}
        className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
      >
        Tahrirlash sahifasiga o'tish
      </a>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Reelni o'chirish</h2>
            <p className="text-gray-700 mb-6">Bu reelni haqiqatan ham o'chirmoqchimisiz?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md hover:bg-gray-200 transition-colors"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                O'chirish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
