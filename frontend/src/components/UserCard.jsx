import { CheckCircleIcon, UserPlusIcon, MapPinIcon } from "lucide-react";
import { getLanguageFlag } from "./FriendCard.jsx";

const UserCard = ({
  user,
  hasRequestBeenSent,
  isPending,
  onSendRequest,
}) => {
  return (
    <div className="card bg-base-200 w-72 carousel-item">
      <div className="card-body p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="avatar size-16 rounded-full">
            <img src={user.profilePic} alt={user.fullName} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{user.fullName}</h3>
            {user.location && (
              <div className="flex items-center text-xs opacity-70 mt-1">
                <MapPinIcon className="size-3 mr-1" />
                {user.location}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="badge badge-secondary">
            {getLanguageFlag(user.nativeLanguage)}
            Native: {user.nativeLanguage}
          </span>
          <span className="badge badge-outline">
            {getLanguageFlag(user.learningLanguage)}
            Learning: {user.learningLanguage}
          </span>
        </div>

        {user.bio && (
          <p className="text-sm opacity-70">{user.bio}</p>
        )}

        <button
          className={`btn w-full mt-2 ${
            hasRequestBeenSent ? "btn-disabled" : "btn-primary"
          }`}
          onClick={() => onSendRequest(user.id)}
          disabled={hasRequestBeenSent || isPending}
        >
          {hasRequestBeenSent ? (
            <>
              <CheckCircleIcon className="size-4 mr-2" />
              Request Sent
            </>
          ) : (
            <>
              <UserPlusIcon className="size-4 mr-2" />
              Send Request
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default UserCard;
