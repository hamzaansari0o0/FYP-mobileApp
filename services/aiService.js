import { httpsCallable } from 'firebase/functions';
// Note: Path '../firebase/firebaseConfig' hai kyunki services aur firebase dono root folder mein hain
import { functions } from '../firebase/firebaseConfig';

export const testGenkitConnection = async () => {
  try {
    console.log("📡 Connecting to Genkit Brain...");
    
    // Server function call kar rahe hain
    const chatFunction = httpsCallable(functions, 'chatWithGenkit');

    // Dummy message
    const result = await chatFunction({ 
      message: "Hello, I want to book a court.", 
      userName: "Tester" 
    });

    console.log("✅ Genkit Response:", result.data);
    return result.data;

  } catch (error) {
    console.error("❌ Connection Failed:", error);
    throw error;
  }
};