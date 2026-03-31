// import { MetadataRoute } from 'next'

// export default function manifest(): MetadataRoute.Manifest {
//   return {
//     name: 'TaskMaster',
//     short_name: 'TaskMaster',
//     description: 'AI-driven lifestyle and goal management assistant',
//     start_url: '/',
//     display: 'standalone', // This removes the browser URL bar
//     background_color: '#ffffff',
//     theme_color: '#000000',
//     icons: [
//       {
//         src: '/icon-192x192.png',
//         sizes: '192x192',
//         type: 'image/png',
//       },
//       {
//         src: '/icon-512x512.png',
//         sizes: '512x512',
//         type: 'image/png',
//       },
//     ],
//   }
// }


// const deleteMarathon = async (marathonId: string) => {
//     if (!confirm("Are you sure you want to abandon this marathon?")) return;
    
//     await fetch(`/api/marathons/${marathonId}`, {
//         method: 'DELETE'
//     });
    
//     // Refresh your UI here
// };

// const saveTaskEdit = async (marathonId: string, day: number, updatedTitle: string, updatedDetail: string) => {
//     await fetch(`/api/marathons/${marathonId}`, {
//         method: 'PATCH',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//             action: 'EDIT_TASK',
//             day: day,
//             newTitle: updatedTitle,
//             newDetail: updatedDetail
//         })
//     });
// };