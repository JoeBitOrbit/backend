import { createClient } from '@supabase/supabase-js';

let supabase = null;

const getSupabaseClient = () => {
  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
  }
  return supabase;
};

export const uploadImage = async (file, folder = 'products') => {
  try {
    const client = getSupabaseClient();
    const fileName = `${folder}/${Date.now()}-${file.originalname}`;
    
    const { data, error } = await client.storage
      .from(process.env.SUPABASE_BUCKET)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype
      });

    if (error) throw error;

    // Get public URL
    const { data: publicData } = client.storage
      .from(process.env.SUPABASE_BUCKET)
      .getPublicUrl(fileName);

    return publicData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

export const deleteImage = async (imageUrl) => {
  try {
    const client = getSupabaseClient();
    const fileName = imageUrl.split('/').pop();
    const { error } = await client.storage
      .from(process.env.SUPABASE_BUCKET)
      .remove([fileName]);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};
