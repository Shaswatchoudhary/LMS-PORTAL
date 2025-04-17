import MediaProgressbar from "@/components/media-progress-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InstructorContext } from "@/context/instructor-context";
import { mediaUploadService } from "@/services";
import { useContext } from "react";

function CourseSettings() {
  const {
    courseLandingFormData,
    setCourseLandingFormData,
    mediaUploadProgress,
    setMediaUploadProgress,
    mediaUploadProgressPercentage,
    setMediaUploadProgressPercentage,
  } = useContext(InstructorContext);

  const handleImageUploadChange = async (event) => {
    const selectedImage = event.target.files?.[0];
    
    if (!selectedImage) return;
    
    try {
      setMediaUploadProgress(true);
      
      // Pass the file directly, not the FormData
      const response = await mediaUploadService(selectedImage);
      
      if (response.success) {
        setCourseLandingFormData((prev) => ({
          ...prev,
          image: response.data.url,
        }));
      }
    } catch (error) {
      console.error("Image upload error:", error);
    } finally {
      setMediaUploadProgress(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course Settings</CardTitle>
      </CardHeader>
      
      <div className="p-4">
        {mediaUploadProgress && (
          <MediaProgressbar
            isMediaUploading={mediaUploadProgress}
            progress={mediaUploadProgressPercentage}
          />
        )}
      </div>
      
      <CardContent>
        {courseLandingFormData?.image ? (
          <img
            src={courseLandingFormData.image}
            alt="Course"
            className="w-full max-w-xs rounded-md shadow-md"
          />
        ) : (
          <div className="flex flex-col gap-3">
            <Label htmlFor="course-image">Upload Course Image</Label>
            <Input
              id="course-image"
              type="file"
              accept="image/*"
              onChange={handleImageUploadChange}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CourseSettings;