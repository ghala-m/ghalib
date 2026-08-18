import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CourseFormDialog } from "@/components/app/CourseFormDialog";
import { useI18n } from "@/lib/i18n";

export function AddCourseDialog() {
  const { t } = useI18n();
  return (
    <CourseFormDialog
      trigger={
        <Button className="w-full" variant="default">
          <Plus className="size-4" />
          {t("addCourse")}
        </Button>
      }
    />
  );
}
