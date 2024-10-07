const uploadImages = async (images) => {
    const promises = images.map(image => uploadFile(image));
    const uploadedImages = await Promise.all(promises);
    return uploadedImages;
  };
  
  const uploadFile = async (file) => {
    console.log(`Uploading ${file.name}...`);
  
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "zpfdzxlu");
  
    const response = await fetch("https://api.cloudinary.com/v1_1/dhaynevdl/upload", {
      method: "post",
      body: formData,
    });
  
    const image = await response.json();
    console.log(image.url);
    return image;
  };
  
  const handleSubmit = async (event) => {
    event.preventDefault();
  
    const form = document.getElementById("uploadForm");  // Actualizado a "uploadForm"
    const formData = new FormData(form);
    const images = formData.getAll("images");
  
    const uploadedImages = await uploadImages(images);
    console.log("Imagenes subidas:", uploadedImages);
  };
  
  const form = document.getElementById("uploadForm");  // Actualizado a "uploadForm"
  form?.addEventListener("submit", handleSubmit);
  