// app/page.tsx  ← 全置換でOK（ここは短いリダイレクト用だけにする）
import { redirect } from "next/navigation";

export default function Root() {
  redirect("/pingpong");
}
