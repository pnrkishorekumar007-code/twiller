import { useAuth } from "@/context/AuthContext";
import { auth, db, storage } from "@/context/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Camera, LinkIcon, MapPin, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import LoadingSpinner from "./loading-spinner";
import { ref, uploadBytesResumable, getDownloadURL, type UploadTask } from "firebase/storage";
import axiosInstance from "@/lib/axiosInstance";
import { useToast } from "@/context/ToastContext";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_DIM = 512;

function compressImage(file: File, maxDim: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Image compression failed"));
        },
        file.type,
        0.85
      );
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

function uploadImage(
  task: UploadTask,
  onProgress: (progress: number) => void,
  timeoutMs = 60000
): Promise<string> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      task.cancel();
      reject(new Error("Image upload timed out. Please try again."));
    }, timeoutMs);

    task.on(
      "state_changed",
      (snapshot) => {
        const progress = Math.round(
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        );
        onProgress(progress);
        console.log("Upload Progress", progress);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        console.error("Upload Error", err);
        reject(new Error(`Upload failed: ${err.message}`));
      },
      async () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          console.log("Upload Complete");
          console.log("Download URL", url);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      }
    );
  });
}

const Editprofile = ({
  isopen,
  onclose,
}: {
  isopen: boolean;
  onclose: () => void;
}) => {
  const { user, setUser } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormdata] = useState({
    displayName: "",
    bio: "",
    location: "",
    website: "",
    avatar: "",
  });
  const [originalAvatar, setOriginalAvatar] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveLockRef = useRef(false);

  useEffect(() => {
    if (!isopen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onclose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isopen, onclose, saving]);

  useEffect(() => {
    if (isopen && user) {
      setFormdata({
        displayName: user.displayName || "",
        bio: user.bio || "",
        location: user.location || "",
        website: user.website || "",
        avatar: user.avatar || "",
      });
      setOriginalAvatar(user.avatar || "");
      setSelectedFile(null);
      setPreviewUrl(null);
      setError({});
      setSaving(false);
      setUploadProgress(0);
      saveLockRef.current = false;
    }
  }, [isopen, user]);

  if (!isopen || !user) return null;

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.displayName.trim()) {
      newErrors.displayName = "Display name is required";
    } else if (formData.displayName.length > 50) {
      newErrors.displayName = "Display name must be 50 characters or less";
    }
    if (formData.bio.length > 160) {
      newErrors.bio = "Bio must be 160 characters or less";
    }
    if (formData.website && formData.website.length > 100) {
      newErrors.website = "Website must be 100 characters or less";
    }
    if (formData.location && formData.location.length > 30) {
      newErrors.location = "Location must be 30 characters or less";
    }
    setError(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormdata((prev) => ({ ...prev, [field]: value }));
    if (error[field]) {
      setError((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const validateImage = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Only JPG, PNG, and WebP images are allowed.";
    }
    if (file.size > MAX_SIZE) {
      return "Image must be under 5MB.";
    }
    return null;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError({});
    const file = e.target.files?.[0];
    if (!file) return;

    const validationError = validateImage(file);
    if (validationError) {
      setError({ avatar: validationError });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl(localUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || saving || saveLockRef.current) return;
    saveLockRef.current = true;
    setSaving(true);
    setUploadProgress(0);
    setError({});

    console.log("Save Started");
    let resolvedAvatar = originalAvatar;

    try {
      if (selectedFile) {
        console.log("Upload Started");
        const compressed = await compressImage(selectedFile, MAX_DIM);
        const timestamp = Date.now();
        const storageRef = ref(
          storage,
          `users/${user.email.replace(/[^a-zA-Z0-9]/g, "_")}/profile-${timestamp}`
        );
        const uploadTask = uploadBytesResumable(storageRef, compressed, {
          contentType: selectedFile.type,
        });

        resolvedAvatar = await uploadImage(uploadTask, setUploadProgress);
      }

      const updatedData = {
        displayName: formData.displayName,
        bio: formData.bio,
        location: formData.location,
        website: formData.website,
        avatar: resolvedAvatar,
      };

      const uid = auth.currentUser?.uid;
      if (uid) {
        console.log("Firestore Update Started");
        await setDoc(
          doc(db, "users", uid),
          {
            photoURL: resolvedAvatar,
            displayName: formData.displayName,
            username: user.username,
            bio: formData.bio,
            location: formData.location,
            website: formData.website,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        console.log("Firestore Update Complete");
      } else {
        console.warn("No Firebase uid found; skipping Firestore update");
      }

      console.log("Backend Sync Started");
      try {
        await axiosInstance.patch(`/userdata/${user.email}`, updatedData);
        console.log("Backend Sync Completed");
      } catch (syncErr: unknown) {
        console.warn("Backend sync failed (Firestore still updated):", syncErr);
      }

      const updatedUser = { ...user, ...updatedData };
      setUser(updatedUser);
      localStorage.setItem("twitter-user", JSON.stringify(updatedUser));

      toast("Profile updated", "success");
      console.log("Profile Save Success");
      onclose();
    } catch (err: unknown) {
      console.error("Profile Update Failed:", err);
      setError({
        general:
          err instanceof Error
            ? err.message
            : "Failed to update profile. Please try again.",
      });
    } finally {
      setSaving(false);
      setUploadProgress(0);
      saveLockRef.current = false;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-in fade-in duration-150"
      onClick={() => !saving && onclose()}
    >
      <Card
        className="w-full max-w-2xl rounded-2xl border-gray-800 bg-black text-white max-h-[90vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="relative pb-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                className="text-white bg-black hover:bg-gray-900"
                onClick={onclose}
                disabled={saving}
              >
                <X className="h-5 w-5" />
              </Button>
              <CardTitle className="text-xl font-bold">Edit profile</CardTitle>
            </div>
            <Button
              type="submit"
              form="edit-profile-form"
              className="bg-white text-black hover:bg-gray-200 font-semibold rounded-full px-6"
              disabled={saving}
            >
              {saving ? (
                <div className="flex items-center space-x-2">
                  <LoadingSpinner size="sm" />
                  <span>
                    {uploadProgress > 0 ? `${uploadProgress}%` : "Saving..."}
                  </span>
                </div>
              ) : (
                "Save"
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {error.general && (
            <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 text-red-400 text-sm m-4">
              {error.general}
            </div>
          )}

          <form id="edit-profile-form" onSubmit={handleSubmit}>
            <div className="relative">
              <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600 relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black/90"
                  disabled={saving}
                >
                  <Camera className="h-6 w-6 text-white" />
                </Button>
              </div>

              <div className="absolute -bottom-16 left-4">
                <div className="relative">
                  <Avatar className="h-32 w-32 border-4 border-black">
                    <AvatarImage
                      src={previewUrl || originalAvatar}
                      alt={user?.displayName}
                    />
                    <AvatarFallback className="text-2xl">
                      {user?.displayName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    id="avatarUpload"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 p-3 rounded-full bg-black/70 hover:bg-black/90"
                    disabled={saving}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-5 w-5 text-white" />
                  </Button>
                </div>
              </div>
            </div>

            {error.avatar && (
              <p className="text-red-400 text-sm px-4 pt-2">{error.avatar}</p>
            )}

            {uploadProgress > 0 && (
              <div className="px-4 pt-2">
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="p-4 mt-16 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-white">
                  Name
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    handleInputChange("displayName", e.target.value)
                  }
                  className="bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                  placeholder="Your display name"
                  maxLength={50}
                  disabled={saving}
                />
                <div className="flex justify-between text-sm">
                  {error.displayName && (
                    <p className="text-red-400">{error.displayName}</p>
                  )}
                  <p className="text-gray-400 ml-auto">
                    {formData.displayName.length}/50
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio" className="text-white">
                  Bio
                </Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleInputChange("bio", e.target.value)}
                  className="bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 resize-none min-h-[100px]"
                  placeholder="Tell the world about yourself"
                  maxLength={160}
                  disabled={saving}
                />
                <div className="flex justify-between text-sm">
                  {error.bio && <p className="text-red-400">{error.bio}</p>}
                  <p className="text-gray-400 ml-auto">
                    {formData.bio.length}/160
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-white">
                  Location
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="location"
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      handleInputChange("location", e.target.value)
                    }
                    className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    placeholder="Where are you located?"
                    maxLength={30}
                    disabled={saving}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  {error.location && (
                    <p className="text-red-400">{error.location}</p>
                  )}
                  <p className="text-gray-400 ml-auto">
                    {formData.location.length}/30
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website" className="text-white">
                  Website
                </Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    id="website"
                    type="text"
                    value={formData.website}
                    onChange={(e) =>
                      handleInputChange("website", e.target.value)
                    }
                    className="pl-10 bg-transparent border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    placeholder="Your website URL"
                    maxLength={100}
                    disabled={saving}
                  />
                </div>
                <div className="flex justify-between text-sm">
                  {error.website && (
                    <p className="text-red-400">{error.website}</p>
                  )}
                  <p className="text-gray-400 ml-auto">
                    {formData.website.length}/100
                  </p>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Editprofile;
