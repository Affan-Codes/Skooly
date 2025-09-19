"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import InputField from "../InputField";
import { parentSchema, type ParentSchema } from "@/lib/formValidationSchemas";
import { createParent, updateParent } from "@/actions/parentActions";
import {
  Dispatch,
  SetStateAction,
  startTransition,
  useActionState,
  useEffect,
} from "react";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const ParentForm = ({
  type,
  data,
  setOpen,
  relatedData,
}: {
  type: "create" | "update";
  data?: any;
  setOpen: Dispatch<SetStateAction<boolean>>;
  relatedData?: any;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ParentSchema>({
    resolver: zodResolver(parentSchema) as Resolver<ParentSchema>,
    defaultValues: {
      id: data?.id,
      username: data?.username || "",
      name: data?.name || "",
      surname: data?.surname || "",
      email: data?.email || "",
      phone: data?.phone || "",
      address: data?.address || "",
      password: type === "create" ? "" : "", // Only required for create
    },
  });

  const [state, formAction] = useActionState<
    { success: boolean; error: boolean; message?: string; },
    ParentSchema
  >(type === "create" ? createParent : updateParent, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      formAction(formData);
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Parent has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
    if (state.error) {
      if (state.message) {
        toast.error(state.message);
      } else {
        toast.error("Something went wrong!");
      }
    }
  }, [state, router, type, setOpen]);

  return (
    <form className="flex flex-col gap-8" onSubmit={ onSubmit }>
      <h1 className="text-xl font-semibold">
        { type === "create" ? "Create a new parent" : "Update the parent" }
      </h1>

      <span className="text-xs text-gray-400 font-medium">
        Authentication Information
      </span>

      <div className="flex justify-between flex-wrap gap-4">
        { data && (
          <InputField
            label="Id"
            name="id"
            register={ register }
            error={ errors?.id }
            hidden
          />
        ) }

        <InputField
          label="Username"
          name="username"
          register={ register }
          error={ errors.username }
        />

        <InputField
          label={ type === "create" ? "Password" : "Password (leave empty to keep current)" }
          name="password"
          type="password"
          register={ register }
          error={ errors.password }
        />
      </div>

      <span className="text-xs text-gray-400 font-medium">
        Personal Information
      </span>

      <div className="flex justify-between flex-wrap gap-4">
        <InputField
          label="First Name"
          name="name"
          register={ register }
          error={ errors.name }
        />

        <InputField
          label="Last Name"
          name="surname"
          register={ register }
          error={ errors.surname }
        />

        <InputField
          label="Email"
          name="email"
          type="email"
          register={ register }
          error={ errors.email }
        />

        <InputField
          label="Phone"
          name="phone"
          register={ register }
          error={ errors.phone }
        />

        <div className="flex flex-col gap-2 w-full md:w-1/2">
          <InputField
            label="Address"
            name="address"
            register={ register }
            error={ errors.address }
          />
        </div>
      </div>
      <div className="flex gap-4">
        <button
          type="submit"
          className="bg-blue-400 text-white p-2 rounded-md hover:bg-blue-500 transition-colors"
        >
          { type === "create" ? "Create" : "Update" }
        </button>

        { type === "create" && (
          <button
            type="button"
            onClick={ () => reset() }
            className="bg-gray-400 text-white p-2 rounded-md hover:bg-gray-500 transition-colors"
          >
            Reset
          </button>
        ) }
      </div>
    </form>
  );
};

export default ParentForm;