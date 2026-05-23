import { createFileRoute } from "@tanstack/react-router";

import { HomeContent } from "@/components/home-content";
import { UploadDialog } from "@/components/upload-dialog";

export const Route = createFileRoute("/upload")({
  component: UploadRoute,
});

function UploadRoute() {
  return (
    <>
      <HomeContent />
      <UploadDialog />
    </>
  );
}
