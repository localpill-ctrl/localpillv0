import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

// Upload prescription image
export const uploadPrescriptionImage = async (
  orderId: string,
  file: File,
  index: number
): Promise<string> => {
  const extension = file.name.split('.').pop() || 'jpg';
  const fileName = `${index}_${Date.now()}.${extension}`;
  const storageRef = ref(storage, `prescriptions/${orderId}/${fileName}`);

  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);

  return downloadUrl;
};

// Upload chat image
export const uploadChatImage = async (
  chatId: string,
  file: File
): Promise<string> => {
  const extension = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}.${extension}`;
  const storageRef = ref(storage, `chat-images/${chatId}/${fileName}`);

  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);

  return downloadUrl;
};
