# ProofMesh — AI-Generated Image Detection

**ProofMesh** is a full-stack web application designed to analyze images and estimate whether they are authentic photographs or AI-generated content.

The application provides a simple image-upload interface and integrates the **Sightengine AI Detection API** to evaluate uploaded images and display detection results.

## Features

- **AI Image Detection:** Analyzes uploaded images for signs of AI generation.
- **Real vs. Fake Classification:** Displays a predicted REAL or FAKE label.
- **Detection Scores:** Shows the AI-generated score and its complementary score.
- **Image Upload:** Supports JPG and PNG images up to 5 MB.
- **Responsive Interface:** Provides an easy-to-use web interface.
- **REST API:** Uses an Express backend to handle image uploads and analysis.
- **Secure API Integration:** Stores Sightengine credentials in environment variables.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | HTML5, CSS3, JavaScript |
| Backend | Node.js, Express.js |
| AI Detection | Sightengine API |
| Image Upload | Multer |
| HTTP Requests | Axios |
| Environment Configuration | dotenv |
| Version Control | Git and GitHub |
| Deployment | Render |

## Project Structure

```text
ProofMesh/
├── public/
│   ├── images/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── server.js
├── predict.js
├── model.js
├── train.js
├── checkDataset.js
├── testPredictions.js
├── testTensorFlow.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
```

The project also contains experimental machine-learning training and testing scripts. The current image detection workflow uses Sightengine.

## How It Works

1. The user opens the ProofMesh website.
2. The user uploads a JPG or PNG image.
3. The frontend sends the image to the Express backend.
4. The backend forwards the image to the Sightengine API.
5. Sightengine returns an AI-generated detection score.
6. ProofMesh displays the classification and score to the user.

## Installation and Setup

### Prerequisites

- Node.js and npm
- Git
- Sightengine API credentials

### Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/ProofMesh.git
cd ProofMesh
```

Replace `YOUR_USERNAME` with your GitHub username.

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env` file in the project root:

```env
SIGHTENGINE_API_USER=your_api_user_id
SIGHTENGINE_API_SECRET=your_api_secret
```

Obtain your credentials from the Sightengine dashboard.

**Security:** Never commit your actual `.env` file or API secrets to GitHub.

### Start the Application

```bash
npm start
```

On Windows PowerShell, if script execution is restricted:

```powershell
npm.cmd start
```

Open the application at:

`http://localhost:3000`

## API Endpoints

### GET /api/health

Checks whether the backend is running.

Example response:

```json
{
  "success": true,
  "message": "ProofMesh API is running",
  "detectionProvider": "Sightengine",
  "version": "sightengine-v2"
}
```

### POST /api/analyze

Analyzes an uploaded image.

**Request:** `multipart/form-data`

**Field name:** `image`

Example request:

```bash
curl -X POST \
  -F "image=@example.jpg" \
  http://localhost:3000/api/analyze
```

The response includes the predicted classification, detection score, uploaded filename, and related metadata.

## Deployment

ProofMesh can be deployed using Render.

Suggested configuration:

| Setting | Value |
|---|---|
| Service Type | Web Service |
| Runtime | Node.js |
| Build Command | `npm install` |
| Start Command | `npm start` |

Set the following environment variables in the Render dashboard:

- `SIGHTENGINE_API_USER`
- `SIGHTENGINE_API_SECRET`

The Express application serves both the frontend and backend from a single deployment.

### Live Application

**Frontend:** Add your deployed website URL here.

**Backend Health Endpoint:** Add your deployed `/api/health` URL here.

## Limitations

- AI image detection is probabilistic and may produce incorrect classifications.
- Detection scores should not be treated as definitive proof that an image is authentic or AI-generated.
- The application requires an internet connection and valid Sightengine API credentials.
- API usage may be subject to provider limits.

## Future Enhancements

- Improve detection result explanations.
- Add image analysis history.
- Support additional image formats.
- Introduce multiple detection models for comparison.
- Enhance the interface with additional visualizations.

## Project Purpose

ProofMesh was developed as a full-stack web development and AI API integration project to explore the challenges of distinguishing authentic images from AI-generated content.

## License

No license has been specified for this repository.