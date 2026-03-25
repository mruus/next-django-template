"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
  createUserAction,
  partialUpdateUserAction,
  type UserType,
} from "@/actions/core/users";

const GENDERS = ["Male", "Female"] as const;
const STATUSES = ["active", "suspended", "blocked"] as const;

type UserDrawerMode = "create" | "edit";

interface UserDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: UserDrawerMode;
  selectedUser: UserType | null;
  direction: "left" | "right";
}

const userSchema = z.object({
  username: z.string().trim().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  email: z.string().email("Invalid email"),
  gender: z.enum(GENDERS),
  status: z.enum(STATUSES),
  phone: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

export default function UserDrawer({
  open,
  onOpenChange,
  mode,
  selectedUser,
  direction,
}: UserDrawerProps) {
  const t = useTranslations("administration.users");
  const commonT = useTranslations("common");
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const schemaWithPassword = userSchema;

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(schemaWithPassword),
    defaultValues: {
      username: "",
      first_name: "",
      last_name: "",
      email: "",
      gender: "Male",
      status: "active",
      phone: "",
    },
  });

  const watchFirstName = watch("first_name");
  const watchLastName = watch("last_name");
  const watchEmail = watch("email");
  const watchUsername = watch("username");

  // Generate username when first_name, last_name, or email changes
  useEffect(() => {
    if (watchUsername && watchUsername.trim() !== "") {
      return; // Don't generate if user has already entered a username
    }

    const firstName = watchFirstName?.trim() || "";
    const lastName = watchLastName?.trim() || "";
    const email = watchEmail?.trim() || "";

    if (!firstName && !lastName && !email) {
      return;
    }

    // Generate username from first+last+email
    let generatedUsername = "";

    if (firstName || lastName) {
      generatedUsername = (firstName + lastName)
        .toLowerCase()
        .replace(/\s+/g, "");
    }

    if (email) {
      const emailPrefix = email.split("@")[0];
      if (!generatedUsername) {
        generatedUsername = emailPrefix;
      } else {
        // Combine with email prefix if we have both
        generatedUsername = generatedUsername + emailPrefix.substring(0, 3);
      }
    }

    // Make it short (max 15 characters)
    generatedUsername = generatedUsername.substring(0, 15);

    // Remove any non-alphanumeric characters
    generatedUsername = generatedUsername.replace(/[^a-z0-9]/g, "");

    // Ensure it's not empty
    if (generatedUsername) {
      setValue("username", generatedUsername);
    }
  }, [watchFirstName, watchLastName, watchEmail, watchUsername, setValue]);

  useEffect(() => {
    if (!open) {
      setAvatarFile(null);
      setAvatarPreview(null);
      return;
    }
    if (mode === "create") {
      reset({
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        gender: "Male",
        status: "active",
        phone: "",
      });
      return;
    }
    if (!selectedUser) return;
    reset({
      username: selectedUser.username,
      first_name: selectedUser.first_name ?? "",
      last_name: selectedUser.last_name ?? "",
      email: selectedUser.email,
      gender: (selectedUser.gender as "Male" | "Female") || "Male",
      status:
        (selectedUser.status as "active" | "suspended" | "blocked") || "active",
      phone: selectedUser.phone ?? "",
    });
    setAvatarPreview(selectedUser.avatar_url ?? null);
  }, [open, mode, selectedUser, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    setAvatarFile(file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  };

  const createMutation = useMutation<void, Error, UserFormValues>({
    mutationFn: async (values) => {
      // Generate username if not provided
      let username = values.username?.trim();
      if (!username) {
        const firstName = values.first_name?.trim() || "";
        const lastName = values.last_name?.trim() || "";
        const email = values.email?.trim() || "";

        let generatedUsername = "";
        if (firstName || lastName) {
          generatedUsername = (firstName + lastName)
            .toLowerCase()
            .replace(/\s+/g, "");
        }

        if (email) {
          const emailPrefix = email.split("@")[0];
          if (!generatedUsername) {
            generatedUsername = emailPrefix;
          } else {
            generatedUsername = generatedUsername + emailPrefix.substring(0, 3);
          }
        }

        generatedUsername = generatedUsername.substring(0, 15);
        generatedUsername = generatedUsername.replace(/[^a-z0-9]/g, "");

        if (generatedUsername) {
          username = generatedUsername;
        } else {
          username = email.split("@")[0] || "user";
        }
      }

      const res = await createUserAction({
        username: username,
        first_name: values.first_name || undefined,
        last_name: values.last_name || undefined,
        email: values.email,
        password: undefined,
        gender: values.gender,
        status: values.status,
        phone: values.phone || undefined,
        avatar: avatarFile ?? undefined,
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.createSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(err.message || t("toasts.error")),
  });

  const updateMutation = useMutation<
    void,
    Error,
    { id: string } & UserFormValues
  >({
    mutationFn: async (payload) => {
      // Generate username if not provided
      let username = payload.username?.trim();
      if (!username) {
        const firstName = payload.first_name?.trim() || "";
        const lastName = payload.last_name?.trim() || "";
        const email = payload.email?.trim() || "";

        let generatedUsername = "";
        if (firstName || lastName) {
          generatedUsername = (firstName + lastName)
            .toLowerCase()
            .replace(/\s+/g, "");
        }

        if (email) {
          const emailPrefix = email.split("@")[0];
          if (!generatedUsername) {
            generatedUsername = emailPrefix;
          } else {
            generatedUsername = generatedUsername + emailPrefix.substring(0, 3);
          }
        }

        generatedUsername = generatedUsername.substring(0, 15);
        generatedUsername = generatedUsername.replace(/[^a-z0-9]/g, "");

        if (generatedUsername) {
          username = generatedUsername;
        } else {
          username = email.split("@")[0] || "user";
        }
      }

      const res = await partialUpdateUserAction(payload.id, {
        username: username,
        first_name: payload.first_name || undefined,
        last_name: payload.last_name || undefined,
        email: payload.email,
        password: undefined,
        gender: payload.gender,
        status: payload.status,
        phone: payload.phone || undefined,
        avatar: avatarFile ?? undefined,
      });
      if (!res.success) throw new Error(res.error || t("toasts.error"));
    },
    onSuccess: () => {
      toast.success(t("toasts.updateSuccess"));
      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => toast.error(err.message || t("toasts.error")),
  });

  const onSubmit = (values: UserFormValues) => {
    if (mode === "create") {
      createMutation.mutate(values);
      return;
    }
    if (!selectedUser) return;
    updateMutation.mutate({ id: selectedUser.id, ...values });
  };

  const busy = createMutation.isPending || updateMutation.isPending;
  const title =
    mode === "create" ? t("drawerTitleCreate") : t("drawerTitleEdit");

  return (
    <Drawer direction={direction} open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="sm:max-w-4xl overflow-y-auto">
        <DrawerHeader className="border-b pb-4">
          <DrawerTitle className="text-base font-semibold text-start">
            {title}
          </DrawerTitle>
        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          <div className="sm:col-span-2">
            <Field>
              <FieldLabel>{t("avatar")}</FieldLabel>
              <FieldContent>
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 rounded-full overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {t("noAvatar")}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {t("chooseImage")}
                    </Button>
                    {avatarFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={() => {
                          setAvatarFile(null);
                          setAvatarPreview(selectedUser?.avatar_url ?? null);
                        }}
                      >
                        {t("removeImage")}
                      </Button>
                    )}
                  </div>
                </div>
              </FieldContent>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="user-username">
              {commonT("username")}
            </FieldLabel>
            <FieldContent>
              <Input id="user-username" {...register("username")} />
              <FieldError
                errors={errors.username ? [errors.username] : undefined}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="user-first_name">{t("firstName")}</FieldLabel>
            <FieldContent>
              <Input id="user-first_name" {...register("first_name")} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="user-last_name">{t("lastName")}</FieldLabel>
            <FieldContent>
              <Input id="user-last_name" {...register("last_name")} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="user-email">{commonT("email")}</FieldLabel>
            <FieldContent>
              <Input id="user-email" type="email" {...register("email")} />
              <FieldError errors={errors.email ? [errors.email] : undefined} />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{t("gender")}</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g} value={g}>
                          {t(`gender_${g}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel>{t("status")}</FieldLabel>
            <FieldContent>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`status_${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldContent>
          </Field>

          <Field>
            <FieldLabel htmlFor="user-phone">{t("phone")}</FieldLabel>
            <FieldContent>
              <Input id="user-phone" {...register("phone")} />
            </FieldContent>
          </Field>

          <div className="sm:col-span-2 flex flex-col gap-2 mt-2">
            <Button type="submit" disabled={busy} className="w-full">
              {commonT("save")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              {commonT("cancel")}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
