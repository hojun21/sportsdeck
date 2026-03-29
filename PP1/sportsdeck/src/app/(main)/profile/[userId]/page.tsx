// Referenced https://stackoverflow.com/questions/76971246/how-to-style-mui-x-charts-xy-axis

"use client";
import { useState, useEffect, use } from "react";
import { redirect, useRouter } from "next/navigation";
import { LineChart } from "@mui/x-charts/LineChart";
import { useUser } from "@/lib/userContext";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type Posts = {
  // Thread or reply
  post: Post;
  id: number;
  title?: string;
  createdAt: Date;
  forumId?: number[];
  content?: string;
};

type Thread = {
  id: number;
  title: string;
  createdAt: Date;
  forumId: number[];
};

type Post = {
  thread?: Thread;
  content: string;
  id: number;
  threadId: number;
};

type Params = {
  params: {
    userId: string;
  };
};

type Follow = {
  followerId: number;
  followingId: number;
  createdAt: string;
  follower: User;
  following: User;
};

type Appeal = {
  id: number;
  reason: string;
  status: string;
  createdAt: string;
};

type User = {
  posts: Post[];
  replies: object[];
  id: number;
  email: string;
  username: string;
  avatar: number;
  favoriteTeamId: number;
  role: string;
  isBanned: boolean;
  createdAt: string;
  followers: Follow[];
  following: Follow[];
  appeals: Appeal[];
};

type Team = {
  id: number;
  name: string;
};

function searchUser(
  searchInput: string,
  router: AppRouterInstance,
  userIdNum: number,
) {
  if (searchInput === "") {
    alert("Please enter a username.");
    return;
  }
  fetch("/api/users?username=" + searchInput, {})
    .then((res) => res.json())
    .then((data) => {
      data.error === undefined
        ? userIdNum === data.user.id
          ? alert("You are already on that user's profile page.")
          : router.push("/profile/" + data.user.id)
        : alert(
            "User not found. Please ensure the username is spelled correctly and capitialized properly.",
          );
    });
}

// Referenced https://stackoverflow.com/questions/79465960/react-a-param-property-was-accessed-directly-with-params
export default function ProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const router = useRouter();
  const { userId } = use(params);
  const userIdNum = Number(userId);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [activity, setActivity] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [searchInput, setSearchInput] = useState("");
  const [following, setFollowing] = useState<Follow[]>([]);
  const [followers, setFollowers] = useState<Follow[]>([]);
  const [profilePictureId, setProfilePictureId] = useState<
    Record<number, number>
  >({});
  const [followersView, setFollowersView] = useState(false);
  const [followingView, setFollowingView] = useState(false);
  const [posts, setPosts] = useState<Posts[]>([]);
  const { user: currentUser } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [appealText, setAppealText] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function handleFollowers(): undefined {
    setFollowersView(!followersView);
  }

  function handleFollowing(): undefined {
    setFollowingView(!followingView);
  }

  function checkCurrentUserFollowingProfileUser(): boolean {
    if (!currentUser) return false;
    const check = followers.filter(
      (follow) => follow.followerId === Number(currentUser["id"]),
    );
    return check.length > 0;
  }

  function checkProfileUserFollowingCurrentUser(): boolean {
    if (!currentUser) return false;
    const check = following.filter(
      (follow) => follow.followingId === Number(currentUser["id"]),
    );
    return check.length > 0;
  }

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1500);
  }

  // Buttons that may be used
  let editProfileButton: React.ComponentProps<"button"> | any = null;
  let followUnfollowButton: React.ComponentProps<"button"> | null = null;
  let forceUnfollowButton: React.ComponentProps<"button"> | null = null;
  let appealBanButton: React.ComponentProps<"button"> | null = null;
  if (currentUser?.isBanned && currentUser.id === userIdNum) {
    appealBanButton = (
      <button
        onClick={() => setShowAppealModal(true)}
        className="px-1 sm:px-3 py-1 rounded-lg text-xs font-semibold text-[#00e5a0] border border-[#00e5a0] hover:bg-[rgba(0,229,160,0.08)]"
      >
        Appeal
      </button>
    );
  }

  useEffect(() => {
    // Get activity of user page
    fetch("/api/users/" + userId + "/activity", {})
      .then((res) => res.json())
      .then((data) => {
        setActivity(data.activity);
      });

    // Get user followers/following list
    fetch("/api/users/" + userId + "/follow", {})
      .then((res) => res.json())
      .then((data) => {
        setFollowers(data.followedBy);
        setFollowing(data.following);
      });

    // Get user posts
    fetch("/api/users/" + userId + "/posts", {})
      .then((res) => res.json())
      .then((data) => setPosts(data.posts));

    // Get profile picture map
    fetch("/api/users/profilepicture", {})
      .then((res) => res.json())
      .then((data) => setProfilePictureId(data.map));

    // Get user information
    fetch("/api/users/" + userId, {})
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load profile");
        setLoading(false);
      });

    // Get team information
    fetch("/api/teams")
      .then((res) => res.json())
      .then((data) => setTeams(data));
  }, []);

  // While page is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-[#6b6b8a] text-sm">Loading...</div>
      </div>
    );
  }

  // Return errors if encountered
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-[#ff4c6a] text-sm">{error}</div>
      </div>
    );
  }

  // If no user is found
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
        <div className="text-[#ff4c6a] text-sm">User does not exist.</div>
      </div>
    );
  }

  // If user is logged in
  if (currentUser) {
    // If the user profile page is the user's
    if (userIdNum === currentUser["id"]) {
      editProfileButton = (
        <button
          type="button"
          onClick={() => router.push("/edit-profile")}
          className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg border border-gray-200 dark:border-gray-800 flex items-center justify-center text-[#6b6b8a] hover:text-[#00e5a0] hover:border-[#00e5a0] transition-colors"
          title="Edit Profile"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-3 h-3 transition-transform group-hover:scale-110"
          >
            <path d="M21.731 2.269a2.625 2.625 0 0 0-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 0 0 0-3.712ZM19.513 8.199l-3.712-3.712-12.15 12.15a5.25 5.25 0 0 0-1.32 2.214l-.8 2.685a.75.75 0 0 0 .933.933l2.685-.8a5.25 5.25 0 0 0 2.214-1.32L19.513 8.2Z" />
          </svg>
        </button>
      );
    } else {
      // If the other user is following the current user
      if (checkProfileUserFollowingCurrentUser()) {
        forceUnfollowButton = (
          <button
            type="button"
            onClick={() =>
              fetchWithAuth("/api/users/" + userId + "/follow", {
                method: "DELETE",
                body: JSON.stringify({ removeFollower: true }),
              }).then(() =>
                fetch("/api/users/" + userId + "/follow", {})
                  .then((res) => res.json())
                  .then((data) => {
                    setFollowers(data.followedBy);
                    setFollowing(data.following);
                  }),
              )
            }
            className="w-20 h-12 rounded-lg border border-[#1e1e2e] flex items-center justify-center text-[#6b6b8a] hover:text-[#00e5a0] hover:border-[#00e5a0] transition-colors"
            title="Remove Follower"
          >
            Remove Follower
          </button>
        );
      }
      // Check if user should be able to follow
      if (
        !checkCurrentUserFollowingProfileUser() &&
        !currentUser.isBanned &&
        user.role != "SYSTEM"
      ) {
        followUnfollowButton = (
          <button
            type="button"
            onClick={() =>
              fetchWithAuth("/api/users/" + userId + "/follow", {
                method: "POST",
              }).then(() =>
                fetch("/api/users/" + userId + "/follow", {})
                  .then((res) => res.json())
                  .then((data) => {
                    setFollowers(data.followedBy);
                    setFollowing(data.following);
                  }),
              )
            }
            className="w-18 h-12 rounded-lg border border-[#1e1e2e] flex items-center justify-center text-[#6b6b8a] hover:text-[#00e5a0] hover:border-[#00e5a0] transition-colors"
            title="Follow User"
          >
            Follow
          </button>
        );
      } else if (
        checkCurrentUserFollowingProfileUser() &&
        user.role != "SYSTEM"
      ) {
        // Current user is following the user, so allow unfollow
        followUnfollowButton = (
          <button
            type="button"
            onClick={() =>
              fetchWithAuth("/api/users/" + userId + "/follow", {
                method: "DELETE",
                body: JSON.stringify({ removeFollower: false }),
              }).then(() =>
                fetch("/api/users/" + userId + "/follow", {})
                  .then((res) => res.json())
                  .then((data) => {
                    setFollowers(data.followedBy);
                    setFollowing(data.following);
                  }),
              )
            }
            className="w-18 h-12 rounded-lg border border-[#1e1e2e] flex items-center justify-center text-[#6b6b8a] hover:text-[#00e5a0] hover:border-[#00e5a0] transition-colors"
            title="Unfollow User"
          >
            Unfollow
          </button>
        );
      }
    }
  }

  async function submitAppeal() {
    if (!appealText.trim()) {
      throw new Error("Please include your reason");
    }

    const res = await fetchWithAuth("/api/users/appeal", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: appealText,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Failed to submit appeal");
    }
  }

  return (
    <>
      <div className="min-h-screen px-4 py-8 relative overflow-hidden flex justify-center items-center">
        {/* BG decorations */}
        <div
          className="absolute -top-32 -right-20 w-96 h-96 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(0,229,160,0.07) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute -bottom-20 -left-24 w-80 h-80 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(76,142,255,0.06) 0%, transparent 70%)",
          }}
        />

        <div className="w-full max-w-lg mx-auto">
          <div className="flex gap-3 mt-2">
            {/* Search Users */}
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
              }}
              placeholder="Search user by username"
              onKeyDown={(e) =>
                e.key === "Enter" && searchUser(searchInput, router, userIdNum)
              }
              className="flex-1 p-2.5 border bg-white dark:bg-[#111118] border-gray-200 rounded-lg dark:border-[#1e1e2e] text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00e5a0] transition-colors placeholder:text-[#6b6b8a]"
            ></input>

            {/* Search Button */}
            <button
              onClick={() => searchUser(searchInput, router, userIdNum)}
              className="p-2.5 rounded-lg text-sm  text-[#00e5a0] font-semibold border border-[#00e5a0] hover:bg-[rgba(0,229,160,0.08)] transition-colors"
            >
              Search
            </button>
          </div>
          <div className="h-12" />
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => router.back()}
              className="text-[#6b6b8a] hover:text-[#f0f0f8] transition-colors text-sm flex items-center gap-1"
            >
              ← Back
            </button>
            <span className="text-[11px] text-[#6b6b8a] tracking-widest">
              {currentUser && userIdNum === currentUser["id"]
                ? "MY PROFILE"
                : "PROFILE"}
            </span>
            <div className="w-12" />
          </div>

          {/* Profile Card */}
          <div className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-xl p-6">
            {/* Avatar + Username */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-8 h-8 sm:w-16 sm:h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-[#1e1e2e]">
                {user ? (
                  <img
                    src={`/avatars/avatar_${user.avatar}.png`}
                    alt="avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-[#1e1e2e] flex items-center justify-center text-[#6b6b8a] text-2xl">
                    ?
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="text-gray-900 dark:text-[#f0f0f8] font-semibold text-sm sm:text-lg">
                  {user?.username ?? "—"}
                </p>
                <p className="text-[#6b6b8a] text-[12px]">
                  {user?.email ?? "—"}
                </p>
                <div className="flex">
                  {user?.role === "ADMIN" && (
                    <span className="text-[10px] font-bold text-[#00e5a0] bg-[rgba(0,229,160,0.12)] px-2 py-0.5 rounded mt-1 inline-block">
                      ADMIN
                    </span>
                  )}
                  {user.isBanned && (
                    <span className="text-[10px] font-bold text-[#800000] bg-[rgba(229,0,0,0.12)] px-2 py-0.5 rounded mt-1 inline-block">
                      BANNED
                    </span>
                  )}
                </div>
              </div>

              {/* Appeal Ban/Force Unfollow/Follow/Edit Button. If not logged in, empty */}
              {appealBanButton}
              {forceUnfollowButton}
              {followUnfollowButton}
              {editProfileButton}
            </div>

            {/* Divider */}
            <div className="h-px bg-gray-200 dark:bg-[#1e1e2e] mb-6" />

            {/* Info rows */}
            <div className="flex flex-col gap-4">
              {/* Favourite team */}
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#6b6b8a] tracking-[0.5px]">
                  FAVOURITE TEAM
                </span>
                <span className="text-gray-900 dark:text-[#f0f0f8] text-sm">
                  {teams.find((t) => t.id === user?.favoriteTeamId)?.name ??
                    "—"}
                </span>
              </div>
              {/* Join date */}
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#6b6b8a] tracking-[0.5px]">
                  MEMBER SINCE
                </span>
                <span className="text-gray-900 dark:text-[#f0f0f8] text-sm">
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : "—"}
                </span>
              </div>
              {/* Followers */}
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#6b6b8a] tracking-[0.5px]">
                  FOLLOWERS
                </span>
                <span className="text-gray-900 dark:text-[#f0f0f8] text-sm">
                  {followers.length}
                </span>
              </div>
              {followers.length > 0 && (
                <>
                  <div className="grid grid-cols-10 gap-4 justify-between items-center">
                    <button
                      onClick={handleFollowers}
                      className="w-18 h-9 rounded-lg border border-[#1e1e2e] flex items-center justify-center text-[#6b6b8a] hover:text-[#00e5a0] hover:border-[#00e5a0] transition-colors"
                    >
                      {followersView ? "Hide All" : "Show All"}
                    </button>
                  </div>
                  <div className="grid grid-cols-10 gap-4 justify-between items-center">
                    {followersView &&
                      followers.map((item) => (
                        <img
                          onClick={() =>
                            router.push("/profile/" + item.followerId)
                          }
                          title={item.follower.username}
                          key={"follower" + item.followerId}
                          src={`/avatars/avatar_${profilePictureId[item.followerId]}.png`}
                          alt="follower avatar"
                          className="w-full h-full object-cover"
                        />
                      ))}
                  </div>
                </>
              )}
              {/* Following */}
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#6b6b8a] tracking-[0.5px]">
                  FOLLOWING
                </span>
                <span className="text-gray-900 dark:text-[#f0f0f8] text-sm">
                  {following.length}
                </span>
              </div>
              {following.length > 0 && (
                <>
                  <div className="grid grid-cols-10 gap-4 justify-between items-center">
                    <button
                      onClick={handleFollowing}
                      className="w-18 h-9 rounded-lg border border-[#1e1e2e] flex items-center justify-center text-[#6b6b8a] hover:text-[#00e5a0] hover:border-[#00e5a0] transition-colors"
                    >
                      {followingView ? "Hide All" : "Show All"}
                    </button>
                  </div>
                  <div className="grid grid-cols-10 gap-4 justify-between items-center">
                    {followingView &&
                      following.map((item) => (
                        <img
                          onClick={() =>
                            router.push("/profile/" + item.followingId)
                          }
                          title={item.following.username}
                          key={"following" + item.followingId}
                          src={`/avatars/avatar_${profilePictureId[item.followingId]}.png`}
                          alt="follower avatar"
                          className="w-full h-full object-cover"
                        />
                      ))}
                  </div>
                </>
              )}
              {/* Activity graph */}
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#6b6b8a] tracking-[0.5px]">
                  ACTIVITY
                </span>
              </div>
              <div className="w-full h-[140px] sm:h-[200px]">
                <LineChart
                  sx={{
                     width: "100%",
                     height: "100%",
                    // For some reason I can't apply it over all, I need to do it one by one
                    "& .MuiChartsAxis-left .MuiChartsAxis-tickLabel": {
                      fill: "#6b6b8a",
                    },
                    "& .MuiChartsAxis-left .MuiChartsAxis-line": {
                      stroke: "#6b6b8a",
                    },
                    "& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabel": {
                      fill: "#6b6b8a",
                    },
                    "& .MuiChartsAxis-bottom .MuiChartsAxis-line": {
                      stroke: "#6b6b8a",
                    },
                  }}
                  xAxis={[
                    {
                      data: [
                        "7 days ago",
                        "6 days ago",
                        "5 days ago",
                        "4 days ago",
                        "3 days ago",
                        "2 days ago",
                        "Yesterday",
                        "Today",
                      ],
                      scaleType: "point",
                    },
                  ]}
                  series={[
                    {
                      data: activity,
                      color: "#00e5a0",
                    },
                  ]}
                  height={160}
                />
              </div>
              {/* Posts of user (threads and replies) */}
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-[#6b6b8a] tracking-[0.5px]">
                  POSTS
                </span>
              </div>
              {/* Ensure user is not banned before showing all their posts */}
              {(!user.isBanned || currentUser?.id === user.id) && (
                <div className="flex flex-col gap-3 w-full">
                  {posts.length === 0 && (
                    <p className="text-xs text-[#8b93a7]">No posts yet.</p>
                  )}
                  {posts.map((item) =>
                    item.title != null ? (
                      // Thread
                      <div
                        key={"Thread" + item.id}
                        onClick={() =>
                          router.push(
                            "/community/" +
                              item.forumId![0] +
                              "/threads/" +
                              item.id,
                          )
                        }
                        className="flex flex-col justify-between items-center"
                      >
                        <span className="text-[11px] text-[#6b6b8a] tracking-[0.5px]">
                          {"Thread posted on " +
                            item.createdAt.toString().substring(0, 10)}
                        </span>
                        <h5 className="text-[20px]">{item.title}</h5>
                        <p>{item.post.content}</p>
                      </div>
                    ) : (
                      // Reply
                      <div
                        key={"Reply" + item.id}
                        onClick={() =>
                          router.push(
                            "/community/" +
                              item.post.thread?.forumId[0] +
                              "/threads/" +
                              item.post.threadId,
                          )
                        }
                        className="flex flex-col justify-between items-center"
                      >
                        <span className="text-[11px] text-[#6b6b8a] tracking-[0.5px]">
                          {"Reply posted on " +
                            item.createdAt.toString().substring(0, 10)}
                        </span>
                        <p>{item.content}</p>
                      </div>
                    ),
                  )}
                </div>
              )}
              {/* Appeal Status */}
              {
              (userIdNum === currentUser?.id || currentUser?.role === "ADMIN") && <div className="mt-6 pt-6 border-t border-gray-200 dark:border-[#1e1e2e]">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-[#6b6b8a] tracking-widest">
                    APPEAL STATUS
                  </span>
                  {user.appeals.length > 0 && (
                    <span className="text-xs text-[#8b93a7] dark:text-[#6b6b8a]">
                      {user.appeals.length} submitted
                    </span>
                  )}
                </div>

                {user.appeals.length === 0 ? (
                  <p className="text-xs text-[#8b93a7] dark:text-[#6b6b8a]">
                    No appeals submitted yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {user.appeals.map((appeal) => {
                      const isPending = appeal.status === "PENDING";
                      const isApproved = appeal.status === "APPROVED";
                      const isRejected = appeal.status === "REJECTED";

                      return (
                        <div
                          key={appeal.id}
                          className="bg-gray-50 dark:bg-[#0a0a0f] border border-gray-100 dark:border-[#1e1e2e] rounded-lg px-3 py-3"
                        >
                          <p className="text-xs italic text-[#8b93a7] dark:text-[#6b6b8a] mb-2">
                            "{appeal.reason}"
                          </p>

                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide
      ${
        isApproved
          ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300"
          : isRejected
            ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300"
            : "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300"
      }`}
                            >
                              {isApproved
                                ? "APPROVED"
                                : isRejected
                                  ? "REJECTED"
                                  : "UNDER REVIEW"}
                            </span>
                          </div>

                          <p className="text-[10px] mt-1 opacity-60">
                            {new Date(appeal.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              }
            </div>
          </div>
        </div>
      </div>
      {showAppealModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[rgba(0,229,160,0.1)] flex items-center justify-center flex-shrink-0">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="#00e5a0"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 2v5l3 3" />
                  <circle cx="8" cy="8" r="6" />
                </svg>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-gray-900 dark:text-[#f0f0f8]">
                  Submit appeal
                </p>
                <p className="text-[12px] text-[#8b93a7] dark:text-[#6b6b8a]">
                  Explain why your ban should be lifted
                </p>
              </div>
            </div>
            <div className="h-px bg-gray-100 dark:bg-[#1e1e2e] mb-4" />
            <textarea
              value={appealText}
              onChange={(e) => setAppealText(e.target.value)}
              placeholder="Write your appeal here..."
              className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-[#0a0a0f] border border-gray-200 dark:border-[#1e1e2e] rounded-lg text-gray-900 dark:text-[#f0f0f8] text-sm outline-none focus:border-[#00a865] dark:focus:border-[#00e5a0] transition-colors resize-none placeholder:text-[#8b93a7] dark:placeholder:text-[#6b6b8a] mb-4"
            />
            <div className="flex flex-col gap-2">
              <button
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-[13px] font-semibold transition-colors
                ${
                  !appealText.trim()
                    ? "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-[#1a1a26] border-gray-200 dark:border-[#1e1e2e] text-[#8b93a7]"
                    : "bg-[#00a865]/10 dark:bg-[#00e5a0]/10 border-[#00a865]/20 dark:border-[#00e5a0]/20 text-[#00a865] dark:text-[#00e5a0] hover:bg-[#00a865]/20 dark:hover:bg-[#00e5a0]/20"
                }`}
                onClick={async () => {
                  try {
                    await submitAppeal();
                    const res = await fetch("/api/users/" + userId);
                    const data = await res.json();
                    setUser(data.user);
                    showToast("Appeal submitted successfully");
                    setShowAppealModal(false);
                  } catch (error: any) {
                    showToast(error.message || "Failed to submit appeal");
                    setShowAppealModal(false);
                  }
                }}
                disabled={!appealText.trim()}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 7l4 4 6-7" />
                </svg>
                Submit appeal
              </button>
              <button
                onClick={() => setShowAppealModal(false)}
                className="w-full px-4 py-2.5 rounded-lg text-[13px] font-medium text-[#8b93a7] dark:text-[#6b6b8a] hover:bg-gray-50 dark:hover:bg-[#1a1a26] hover:text-gray-900 dark:hover:text-[#f0f0f8] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="flex items-center gap-3 bg-white dark:bg-[#111118] border border-gray-200 dark:border-[#1e1e2e] rounded-2xl px-5 py-4 shadow-2xl max-w-sm w-full mx-4"
            style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}
          >
            {/* Accent dot */}
            <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[#00a865] dark:bg-[#00e5a0]" />

            {/* Message */}
            <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-[#f0f0f8]">
              {toast}
            </p>

            {/* Close */}
            <button
              onClick={() => setToast(null)}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-[#8b93a7] dark:text-[#6b6b8a] hover:bg-gray-100 dark:hover:bg-[#1e1e2e] hover:text-gray-900 dark:hover:text-[#f0f0f8]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <path d="M2 2l10 10M12 2L2 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
