import { notFound } from "next/navigation";
import { SiteShell } from "@/components/upbranch/ui/site-shell";
import { CourseLessonView } from "@/components/upbranch/learn/course-lesson";
import { courseLessons } from "@/lib/upbranch/courses/catalog";

export default async function CourseLessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { lessonId } = await params;
  if (!courseLessons.some((lesson) => lesson.id === lessonId)) notFound();
  return <SiteShell><main id="main-content" tabIndex={-1}><CourseLessonView key={lessonId} lessonId={lessonId} /></main></SiteShell>;
}
