import { useState } from "react";
import { kbService } from "../services/kbService";
import { toast } from "react-hot-toast";

export const useKnowledge = () => {
  const [loading, setLoading] = useState(false);

  const handleAddSingle = async (formData, onSuccess) => {
    setLoading(true);
    try {
      await kbService.addSingle(formData);
      toast.success("Đã gửi dữ liệu sang n8n thành công!");
      if (onSuccess) onSuccess();
    } catch {
      toast.error("Gửi thất bại, vui lòng kiểm tra lại kết nối.");
    } finally {
      setLoading(false);
    }
  };

  return { loading, handleAddSingle };
};
