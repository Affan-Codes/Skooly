"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Resolver, useForm } from "react-hook-form";
import InputField from "../InputField";
import Image from "next/image";
import { teacherSchema, TeacherSchema } from "@/lib/formValidationSchemas";
import {
  Dispatch,
  SetStateAction,
  startTransition,
  useActionState,
  useEffect,
  useState,
} from "react";
import { createTeacher, updateTeacher } from "@/actions/teacherActions";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { CldUploadWidget } from "next-cloudinary";

const TeacherForm = ({
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
  } = useForm<TeacherSchema>({
    resolver: zodResolver(teacherSchema) as Resolver<TeacherSchema>,
  });

  const [img, setImg] = useState<any>();

  const [state, formAction] = useActionState<
    { success: boolean; error: boolean; message?: string; },
    TeacherSchema
  >(type === "create" ? createTeacher : updateTeacher, {
    success: false,
    error: false,
  });

  const onSubmit = handleSubmit((formData) => {
    startTransition(() => {
      const imageUrl = img?.secure_url || formData.img || (data?.img ?? "");
      formAction({ ...data, img: imageUrl });
    });
  });

  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      toast(`Teacher has been ${type === "create" ? "created" : "updated"}!`);
      setOpen(false);
      router.refresh();
    }
  }, [state, router, type, setOpen]);

  const { subjects } = relatedData;

  return (
    <form className="flex flex-col gap-8" onSubmit={ onSubmit }>
      <h1 className="text-xl font-semibold">
        { type === "create" ? "Create a new teacher" : "Update the teacher" }
      </h1>
      <span className="text-xs text-gray-400 font-medium">
        Authentication Information
      </span>

      <div className="flex flex-wrap gap-4 justify-between">
        <InputField
          label="Username"
          name="username"
          defaultValue={ data?.username }
          register={ register }
          error={ errors.username }
        />
        <InputField
          label="Email"
          name="email"
          type="email"
          defaultValue={ data?.email }
          register={ register }
          error={ errors.email }
        />
        <InputField
          label="Password"
          name="password"
          type="password"
          defaultValue={ data?.password }
          register={ register }
          error={ errors.password }
        />
      </div>

      <span className="text-xs text-gray-400 font-medium">
        Personal Information
      </span>

      <div className="flex flex-wrap justify-between gap-4">
        <InputField
          label="First Name"
          name="name"
          defaultValue={ data?.name }
          register={ register }
          error={ errors.name }
        />
        <InputField
          label="Last Name"
          name="surname"
          defaultValue={ data?.surname }
          register={ register }
          error={ errors.surname }
        />
        <InputField
          label="Phone"
          name="phone"
          defaultValue={ data?.phone }
          register={ register }
          error={ errors.phone }
        />
        <InputField
          label="Address"
          name="address"
          defaultValue={ data?.address }
          register={ register }
          error={ errors.address }
        />
        <InputField
          label="Blood Type"
          name="bloodType"
          defaultValue={ data?.bloodType }
          register={ register }
          error={ errors.bloodType }
        />
        <InputField
          label="Birthday"
          name="birthday"
          defaultValue={ data?.birthday.toISOString().split("T")[0] }
          register={ register }
          error={ errors.birthday }
          type="date"
        />
        { data && (
          <InputField
            label="Id"
            name="id"
            defaultValue={ data?.id }
            register={ register }
            error={ errors?.id }
            hidden
          />
        ) }
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Sex</label>
          <select
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("sex") }
            defaultValue={ data?.sex }
          >
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
          { errors.sex?.message && (
            <p className="text-xs text-red-400">
              { errors.sex.message.toString() }
            </p>
          ) }
        </div>
        <div className="flex flex-col gap-2 w-full md:w-1/4">
          <label className="text-xs text-gray-500">Subjects</label>
          <select
            multiple
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm w-full"
            { ...register("subjects") }
            defaultValue={ data?.subjects }
          >
            { subjects.map((subject: { id: number; name: string; }) => (
              <option key={ subject.id } value={ subject.id }>
                { subject.name }
              </option>
            )) }
          </select>
          { errors.subjects?.message && (
            <p className="text-xs text-red-400">
              { errors.subjects.message.toString() }
            </p>
          ) }
        </div>
        <div className="flex flex-col gap-1">
          { (img?.secure_url || data?.img) && (
            <div className="flex items-center gap-2">
              <Image
                src={ img?.secure_url || data.img }
                alt="Teacher photo"
                width={ 60 }
                height={ 60 }
                className="rounded-full object-cover"
              />
              <span className="text-xs text-gray-500">Current photo</span>
            </div>
          ) }

          <CldUploadWidget
            uploadPreset="skooly"
            onSuccess={ (result, { widget }) => {
              setImg(result.info);
              widget.close();
            } }
          >
            { ({ open }) => {
              return (
                <div
                  className="text-xs text-gray-500 flex items-center gap-2 cursor-pointer"
                  onClick={ () => open() }
                >
                  <Image src="/upload.png" alt="" height={ 28 } width={ 28 } />
                  <span>Upload a photo</span>
                </div>
              );
            } }
          </CldUploadWidget>
        </div>
      </div>
      { state.error && (
        <span className="text-red-500">
          { state.message || "Something went wrong!" }
        </span>
      ) }

      <button className="bg-blue-400 text-white p-2 rounded-md">
        { type === "create" ? "Create" : "Update" }
      </button>
    </form>
  );
};

export default TeacherForm;

// PASS