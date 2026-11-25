# Facefinder Frame Studio

api keys from my Ultralytics project  ul_16ebae03fe59e4579093a0f0ec08f3b681726a63
endpoint keys https://predict-6afd41dafbef722426f45876-dproatj77a-ey.a.run.app
NOTE Do not show the keys in the code 
Build a web app called "Face Prediction" using React, TypeScript, Tailwind and shadcn/ui. It lets a user upload or capture a photo and sends it to my Ultralytics model inference API, then shows the predictions.

BACKEND (do this first)
- Connect Supabase and create an Edge Function called "predict".
- It accepts an image (multipart form data) from the frontend and forwards it to the Ultralytics inference endpoint stored in a secret named ULTRALYTICS_ENDPOINT.
- It sends my API key from a secret named ULTRALYTICS_API_KEY in the "x-api-key" header, with the image in a form field named "image" and the parameters imgsz=640, conf=0.25, iou=0.45.
- It returns the JSON response to the frontend, with error handling for failed or invalid responses.
- Never put the key or endpoint in frontend code. Ask me to enter both secrets using Lovable's secrets prompt.

FRONTEND
1. A clean, responsive layout with an image upload area on the left and a results panel on the right, plus a light/dark mode toggle.
2. Drag-and-drop or click-to-select upload for JPG and PNG images (max 10 MB) with a preview, and a "Use Camera" option that captures a photo from the webcam, with a "Retake" button.
3. A "Predict" button that sends the image to the "predict" function, with loading states and friendly error messages.
4. Draw the returned bounding boxes over the image with a label and confidence percentage, scaled to the displayed image size.
5. A results table listing each prediction (class, confidence, box coordinates), and a confidence threshold slider that hides low-confidence results.
6. Show "No face detected" when the response is empty.
7. A download button for the annotated image.

IMPORTANT
- First log the raw API response so we can check its structure, then map the fields correctly.
- Do not store uploaded images. Add the notice: "Images are sent to a third-party API for analysis and are not stored by this app."
- Add a short About section describing what the model predicts and its limitations.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://facefinder-frame-studio.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9de6fd1c-5ea3-4e4a-ad9f-49b9aa369654).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
