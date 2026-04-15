import { useRef } from "react";
import { UploadCloud, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function ImageUploader({ onImageSelected }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      toast.error("Please upload a valid JPG or PNG image.");
      e.target.value = "";
      return;
    }

    // Validate size (e.g., max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("Image size must be less than 5MB.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      onImageSelected(event.target.result);
      // Reset input so the same file could be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file.");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/jpeg, image/png"
        onChange={handleFileChange}
        className="hidden"
        id="face-image-upload"
      />
      <label
        htmlFor="face-image-upload"
        className="cursor-pointer flex flex-col items-center justify-center w-full aspect-video border-2 border-dashed border-border rounded-xl bg-muted/20 hover:bg-muted/50 hover:border-primary/50 transition-all text-muted-foreground hover:text-primary"
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadCloud className="w-10 h-10 mb-3 opacity-70" />
          <p className="mb-2 text-sm font-semibold">Click to upload fallback image</p>
          <p className="text-xs opacity-70">JPG or PNG (MAX. 5MB)</p>
        </div>
      </label>
    </div>
  );
}
