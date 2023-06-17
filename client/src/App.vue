<script setup lang="ts">
import MyButton from './components/MyButton.vue';
import { mpvRequest } from './lib/http-client';
import { 
  StopIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  PlayPauseIcon,
  ArrowUturnLeftIcon,
  SpeakerXMarkIcon,
  PlusIcon,
  MinusIcon,
  ChatBubbleBottomCenterIcon,
  FolderIcon,
  FilmIcon,
  ArrowUpIcon,
} from '@heroicons/vue/20/solid';
import { Ref, ref, computed } from 'vue';

interface Button  {
  text: string,
  commands: Array<Array<string|number>> | (()=>void),
  icon: any,
  color: Ref<string>,
}

const directoryListing = ref<Record<string,string>>({});
const currentDirectory = ref<string>("");
const percentPos = ref<number>(0);
const currentFile = ref<string>("");
const pauseButtonColor = ref<string>("primary");
const muteButtonColor = ref<string>("primary");
const subtitleButtonColor = ref<string>("primary");
const volumeLevel = ref<number>(0);

const primaryButtonColor = ref<string>("primary");

const buttons: Array<Array<Button>> = [
  [
  { text: "Seek -60", commands: [["seek", -60]], icon: ChevronDoubleLeftIcon, color: primaryButtonColor},
  { text: "Seek -5", commands: [["seek", -5]], icon: ChevronLeftIcon, color: primaryButtonColor},
  { text: "Seek +5", commands: [["seek", 5]], icon: ChevronRightIcon, color: primaryButtonColor},
  { text: "Seek +60", commands: [["seek", 60]], icon: ChevronDoubleRightIcon, color: primaryButtonColor},
  ],
  [ 
  { text: "Restart", commands: [["seek", 0, "absolute"]], icon: ArrowUturnLeftIcon, color: primaryButtonColor},
  { text: "Pause", commands: [["cycle", "pause"]], icon: PlayPauseIcon, color: pauseButtonColor},
  { text: "Stop", commands: [["stop"], ["write-watch-later-config"]], icon: StopIcon, color: primaryButtonColor},
  ],
  [
  { text: "Subtitles", commands: [["cycle", "sub-visibility"]], icon: ChatBubbleBottomCenterIcon, color: subtitleButtonColor},
]];

const soundButtons: Array<Button> = [
  { text: "Volume -5", commands: [["add", "volume", -5]], icon: MinusIcon, color: primaryButtonColor},
  { text: "Mute", commands: [["cycle", "mute"]], icon: SpeakerXMarkIcon, color: muteButtonColor},
  { text: "Volume +5", commands: [["add", "volume", 5]], icon: PlusIcon, color: primaryButtonColor},
];

const listDirectory = async (target?: string) => {
  const args = ["list_directory"];
  if (target) {
    args.push(target);
  }
  return mpvRequest(...args);
}

listDirectory().then((response) => {
  directoryListing.value = response.data.listing;
  currentDirectory.value = response.data.directory;
});

const getButtonType = (listingType: string) => {
  switch (listingType) {
    case "video":
      return "primary";
    case "directory":
      return "accent";
    default:
      return "nothing"; // btn-nothing is not a real class
  }
}

const directoryTitle = computed(() => {
  const path = currentDirectory.value.split("/");
  return path[path.length - 1];
});

const filenameShouldBeDisplayed = (listingName: string) => {
  return listingName.charAt(0) !== ".";
}

const onListingButtonClicked = (listingName: string, listingType: string) => {
  if (listingType === "directory") {
    // list directory from server
    listDirectory(currentDirectory.value + "/" + listingName).then((response) => {
      directoryListing.value = response.data.listing;
      currentDirectory.value = response.data.directory;
    });
  } else {
    // join current directory with listingName
    const fullPath = currentDirectory.value + "/" + listingName;
    mpvRequest("loadfile", fullPath, "replace");
    updateProperties(true);
  }
}

const onControlButtonClicked = async (button: Button) => {
  if (typeof button.commands === "function") {
    // run the command if it's a function
    button.commands();
  } else {
    // otherwise run each MPV command in the array
    for (const command of button.commands) {
      await mpvRequest(...command);
    }
  }
  updateProperties(true);
}

const onUpDirectoryClicked = async () => {
  const path = currentDirectory.value.split("/");
  path.pop();
  const newPath = path.join("/") || "/";
  const response = await listDirectory(newPath);
  directoryListing.value = response.data.listing;
  currentDirectory.value = response.data.directory;
}

const getPercentPos = async () => {
  try {
    const response = await mpvRequest("get_property", "percent-pos");
    if (response.data.error !== "success") {
      return 0;
    }
    return response.data.data;
  } catch (e) {
    return 0;
  }
}

const getCurrentFile = async () => {
  try {
    const response = await mpvRequest("get_property", "filename");
    if (response.data.error !== "success") {
      return "NOTHING PLAYING";
    }
    return response.data.data;
  } catch (e) {
    return "SERVER ERROR";
  }
}

const getPauseStatus = async () => {
  try {
    const response = await mpvRequest("get_property", "pause");
    if (response.data.error !== "success") {
      return false;
    }
    return response.data.data;
  } catch (e) {
    return false;
  }
}

const getSubtitleStatus = async () => {
  try {
    const response = await mpvRequest("get_property", "sub-visibility");
    if (response.data.error !== "success") {
      return false;
    }
    return response.data.data;
  } catch (e) {
    return false;
  }
}

let pollTimeout:number|null = null

document.addEventListener('visibilitychange', ()=>{
  if (document.hidden && pollTimeout !== null) {
    clearTimeout(pollTimeout);
    pollTimeout = null;
  } else if (! document.hidden && pollTimeout === null) {
    updateProperties();
  }
}, false);

async function updateProperties(oneTime: boolean = false) {
  if (! document.hidden){
    percentPos.value = await getPercentPos();
    currentFile.value = await getCurrentFile();
    pauseButtonColor.value = (await getPauseStatus()) ? "secondary" : "primary";
    muteButtonColor.value = (await mpvRequest("get_property", "mute")).data.data ? "secondary" : "primary";
    subtitleButtonColor.value = (await getSubtitleStatus()) ? "secondary" : "primary";
    volumeLevel.value = (await mpvRequest("get_property", "volume")).data.data;
  }

  if (! oneTime) {
    pollTimeout = setTimeout(updateProperties, document.hidden ? 15000 : 5000);
  }
}

updateProperties();


</script>

<template>
  <header class="sticky flex justify-start pr-3">
    <MyButton class="box-border w-full m-1 break-all overflow-y-clip" buttonType="neutral" @click="onUpDirectoryClicked">
      <ArrowUpIcon class="h-6 w-6 text-white-500"/>
      <FolderIcon class="h-6 w-6 text-white-500"/>{{directoryTitle}}
    </MyButton>
  </header>
  <main class="flex flex-col h-[calc(100vh-400px)]">
    <div class="bg-gray-50 overflow-y-auto grid grid-row pr-3">
        <div v-for="listingType, listingName of directoryListing">
          <template v-if="filenameShouldBeDisplayed(listingName)">
          <MyButton 
            class="box-border w-full m-1 flex overflow-y-clip" 
            :buttonType="getButtonType(listingType)" 
            @click="onListingButtonClicked(listingName, listingType)"
          >
          <div class="flex flex-row items-center">
            <div v-if="listingType=='directory'">
              <FolderIcon class="h-6 w-6 text-white-500 mr-2"/>
            </div>
            <div v-else-if="listingType=='video'">
              <FilmIcon class="h-6 w-6 text-white-500 mr-2"/>
            </div>
            <div class="h-fit break-all">{{ listingName }}</div>
          </div>
          </MyButton>
          </template>
        </div>
    </div>
  </main>
  <footer class="flex flex-wrap justify-center">
    <h2 class="mt-5 pr-5 pl-5 w-full break-all">{{ currentFile }}</h2>
    <progress class="progress progress-primary w-full m-5" :value="percentPos" max="100"></progress>
    <div v-for="buttonRow of buttons" class="flex mx-3">
      <MyButton v-for="button in buttonRow" class="m-1" :buttonType="button.color.value">
        <component :is="button.icon" class="h-6 w-6 text-white-500" @click="onControlButtonClicked(button)"/>
      </MyButton>
    </div>
    <progress class="progress w-full m-5" :class="`progress-${muteButtonColor}`" :value="volumeLevel" max="100"></progress>
    <div class="flex mx-3">
      <MyButton v-for="button in soundButtons" class="m-1" :buttonType="button.color.value">
        <component :is="button.icon" class="h-6 w-6 text-white-500" @click="onControlButtonClicked(button)"/>
      </MyButton>
    </div>
  </footer>

</template>

<style scoped>

</style>
